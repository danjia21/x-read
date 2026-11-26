import unittest

from fetch_wechat import parse_article


class EquationExtractionTests(unittest.TestCase):
    def extract(self, body, include_images=True):
        return parse_article(
            '<h1 id="activity-name">Example</h1><div id="js_content">'
            + body + '</div><p>Outside article</p>',
            'https://mp.weixin.qq.com/s/example', include_images=include_images,
        ).content

    def test_nested_svg_formulas_are_preserved_once(self):
        result = self.extract(r'<p>Noise <span data-formula="\epsilon"><span data-formula="\epsilon"><svg><g>duplicate</g></svg></span></span> and time <span data-formula="t"><svg></svg></span>.</p>')
        self.assertEqual(result, r'Noise $\epsilon$ and time $t$.')

    def test_display_formula_survives_images_and_line_breaks(self):
        result = self.extract(r'<img src="https://example.org/a.png"><br><section data-formula="u_t=\epsilon-a"><svg><path /></svg></section><p>Following paragraph</p>')
        self.assertIn('$$u_t=\\epsilon-a$$', result)
        self.assertIn('Following paragraph', result)
        self.assertNotIn('Outside article', result)
        self.assertIn('![image]', result)

    def test_superscripts_subscripts_and_no_images_keep_math(self):
        result = self.extract('<p>2<sup>O(n)</sup> and x<sub>t</sub></p><img data-formula="a+b" src="https://example.org/math.png">', include_images=False)
        self.assertEqual(result, '2<sup>O(n)</sup> and x<sub>t</sub>\n\n$a+b$')

    def test_svg_without_formula_is_not_mistaken_for_tex(self):
        result = self.extract('<p>Before <svg><text>logo</text></svg> after</p>')
        self.assertEqual(result, 'Before after')


if __name__ == '__main__':
    unittest.main()
