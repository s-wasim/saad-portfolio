"""Tests for textfile.py — run from this folder:  python3 -m unittest -v test_textfile"""
import unittest

import textfile as tf


class Parse(unittest.TestCase):
    def test_entries_run_to_the_next_header_and_are_trimmed(self):
        p = tf.parse('notes up here\n<!-- A | x -->\n\n hello \nworld\n\n<!--B|y-->\nz\n')
        self.assertEqual(p.entries, {'A | x': 'hello \nworld', 'B|y': 'z'})

    def test_header_line_numbers_are_one_based(self):
        p = tf.parse('notes\n<!-- A | x -->\none\n<!-- B -->\ntwo')
        self.assertEqual(p.lines, {'A | x': 2, 'B': 4})

    def test_header_whitespace_is_collapsed(self):
        p = tf.parse('<!--   WORK   |  card /  title   -->\nt')
        self.assertEqual(list(p.entries), ['WORK | card / title'])

    def test_crlf_and_bom_parse_like_lf(self):
        a = tf.parse('\ufeff<!-- A -->\r\none\r\ntwo\r\n<!-- B -->\r\nthree\r\n')
        b = tf.parse('<!-- A -->\none\ntwo\n<!-- B -->\nthree\n')
        self.assertEqual(a.entries, b.entries)

    def test_duplicate_header_first_wins_and_is_reported(self):
        p = tf.parse('<!-- A -->\none\n<!-- A -->\ntwo\n')
        self.assertEqual(p.entries, {'A': 'one'})
        self.assertEqual(p.dups, [('A', 3)])

    def test_empty_entry_is_kept_as_empty_string(self):
        p = tf.parse('<!-- E -->\n\n<!-- F -->\nf')
        self.assertEqual(p.entries, {'E': '', 'F': 'f'})

    def test_inline_comment_inside_text_is_not_a_header(self):
        p = tf.parse('<!-- A -->\nkeep <!-- this --> inline')
        self.assertEqual(p.entries, {'A': 'keep <!-- this --> inline'})


class Markers(unittest.TestCase):
    def test_all_three_forms_with_counts_and_slots(self):
        m = tf.markers("<p>⟦A | x⟧</p><b>⟦A | x⟧</b> s='⟦js:B⟧' g='⟦js{name,greeting}:C⟧'")
        self.assertEqual(m['A | x'].ctx, {'html'})
        self.assertEqual(m['A | x'].count, 2)
        self.assertIsNone(m['A | x'].slots)
        self.assertEqual(m['B'].ctx, {'js'})
        self.assertIsNone(m['B'].slots)
        self.assertEqual(m['C'].slots, frozenset({'name', 'greeting'}))

    def test_marker_keys_are_normalised_like_headers(self):
        m = tf.markers('⟦  WORK |  title ⟧')
        self.assertEqual(list(m), ['WORK | title'])


class Escape(unittest.TestCase):
    def test_html_escapes_five_characters(self):
        self.assertEqual(tf.esc_html('a & <c> "d" \'e\''),
                         'a &amp; &lt;c&gt; &quot;d&quot; &#39;e&#39;')

    def test_html_turns_line_breaks_into_one_space(self):
        self.assertEqual(tf.esc_html('one\n   two  \n\nthree'), 'one two three')

    def test_js_escapes_everything_that_could_end_or_bend_a_literal(self):
        cases = {'\\': '\\\\', "'": "\\'", '"': '\\"', '`': '\\`', '$': '\\$',
                 '\n': '\\n', '\r': '\\r', '\t': '\\t', '\u2028': '\\u2028',
                 '\u2029': '\\u2029', '<': '\\x3C'}
        for raw, want in cases.items():
            self.assertEqual(tf.esc_js(raw), want, repr(raw))
        self.assertEqual(tf.esc_js('it’s — fine'), 'it’s — fine')


class Fill(unittest.TestCase):
    def test_live_then_backup_then_key(self):
        out, missing = tf.fill('<p>⟦A⟧</p><i>⟦B⟧</i>', {'A': 'live'}, {'A': 'old'})
        self.assertEqual(out, '<p>live</p><i>B</i>')
        self.assertEqual(missing, ['B'])

    def test_backup_used_when_live_lacks_the_key(self):
        out, missing = tf.fill('<p>⟦A⟧</p>', {}, {'A': 'old'})
        self.assertEqual(out, '<p>old</p>')
        self.assertEqual(missing, [])

    def test_context_decides_the_escaping(self):
        out, _ = tf.fill("<p>⟦A⟧</p>x='⟦js{n}:C⟧'", {'A': '1<2', 'C': "it's {n}"}, {})
        self.assertEqual(out, "<p>1&lt;2</p>x='it\\'s {n}'")

    def test_dollar_patterns_in_values_are_literal(self):
        out, _ = tf.fill('⟦A⟧|⟦js:A⟧', {'A': r'$1 $& \1'}, {})
        self.assertEqual(out, r'$1 $&amp; \1|\$1 \$& \\1')

    def test_empty_value_fills_empty(self):
        out, missing = tf.fill('[⟦A⟧]', {'A': ''}, {'A': 'old'})
        self.assertEqual((out, missing), ('[]', []))


class Check(unittest.TestCase):
    TPL = "<p>⟦HOME | intro⟧</p><a>⟦GLOBAL | repo link⟧</a> g='⟦js{name}:TWIN | greeting⟧'"
    GOOD = ('<!-- GLOBAL | repo link -->\nsource →\n'
            '<!-- HOME | intro -->\nhello\n'
            '<!-- TWIN | greeting -->\nhi {name}\n')

    def errors(self, text):
        return [p for p in tf.check(text, self.TPL) if p.level == 'error']

    def test_good_file_has_no_problems(self):
        self.assertEqual(tf.check(self.GOOD, self.TPL), [])

    def test_mistyped_header_is_unknown_with_a_suggestion_and_the_original_is_missing(self):
        text = self.GOOD.replace('HOME | intro', 'HOME | intor')
        msgs = [p.msg for p in self.errors(text)]
        self.assertTrue(any('HOME | intor' in m and 'HOME | intro' in m for m in msgs), msgs)
        self.assertTrue(any(m.startswith('Missing') and 'HOME | intro' in m for m in msgs), msgs)

    def test_unknown_header_reports_its_line(self):
        text = self.GOOD + '<!-- WORK | nowhere -->\nx\n'
        errs = self.errors(text)
        self.assertEqual([p.line for p in errs], [7])

    def test_duplicate_header(self):
        text = self.GOOD + '<!-- HOME | intro -->\nagain\n'
        self.assertTrue(any('twice' in p.msg for p in self.errors(text)))

    def test_slot_missing_or_extra(self):
        for bad in ('hi there', 'hi {name} {nme}'):
            text = self.GOOD.replace('hi {name}', bad)
            self.assertTrue(any('{name}' in p.msg for p in self.errors(text)), bad)

    def test_double_brace_is_rejected(self):
        text = self.GOOD.replace('hello', 'hello {{ x }}')
        self.assertTrue(any('{{' in p.msg for p in self.errors(text)))

    def test_empty_entry_is_fine(self):
        self.assertEqual(self.errors(self.GOOD.replace('hello', '')), [])

    def test_header_split_across_lines_is_pointed_at(self):
        # what happens when a word of a header is replaced by a line break
        text = self.GOOD.replace('<!-- HOME | intro -->', '<!-- HOME | \n intro -->')
        errs = self.errors(text)
        broken = [p for p in errs if 'broken header' in p.msg]
        self.assertEqual([p.line for p in broken], [3, 4], [p.msg for p in errs])
        self.assertTrue(all('GLOBAL | repo link' in p.msg for p in broken), broken)

    def test_notes_above_the_first_header_may_mention_headers(self):
        text = 'example: <!-- WORK | x -->  (like this)\n<!-- broken\n' + self.GOOD
        self.assertEqual(self.errors(text), [])


class Bake(unittest.TestCase):
    def test_bake_fills_markup_and_script_markers(self):
        html, missing = tf.bake('<!-- A -->\nFish & "chips"\n<!-- B -->\nit\'s\n',
                                "<p>⟦A⟧</p><script>x='⟦js:B⟧'</script>")
        self.assertEqual(html, "<p>Fish &amp; &quot;chips&quot;</p><script>x='it\\'s'</script>")
        self.assertEqual(missing, [])

    def test_bake_missing_key_reported_and_visible(self):
        html, missing = tf.bake('<!-- A -->\na\n', '<p>⟦A⟧ ⟦B | gone⟧</p>')
        self.assertEqual(html, '<p>a B | gone</p>')
        self.assertEqual(missing, ['B | gone'])


if __name__ == '__main__':
    unittest.main()
