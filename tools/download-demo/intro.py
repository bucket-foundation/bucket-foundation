from manim import *
import math


class CoinQuestion(Scene):
    def construct(self):
        self.camera.background_color = "#eeeadf"
        title = Text("How much can a coin tell you?", font="Fraunces", color="#1f1c16", font_size=35).to_edge(UP, buff=.65)
        subtitle = Text("BUCKET  /  FOLLOW A QUESTION", color="#75674f", font_size=14).next_to(title, DOWN, buff=.25)
        axes = Axes(x_range=[0, 1, .5], y_range=[0, 1, .5], x_length=7, y_length=3, axis_config={"color": "#a99a7d", "include_tip": False}).shift(DOWN * .3)
        def entropy(p):
            return 0 if p <= 0 or p >= 1 else -p * math.log2(p) - (1-p) * math.log2(1-p)
        graph = axes.plot(entropy, x_range=[.0001, .9999], color="#315e50", stroke_width=4)
        p = ValueTracker(.5)
        point = always_redraw(lambda: Dot(axes.c2p(p.get_value(), entropy(p.get_value())), color="#b8861e", radius=.09))
        value = always_redraw(lambda: Text(f"{entropy(p.get_value()):.2f} bits", font="Fraunces", color="#315e50", font_size=30).move_to([0, 1.9, 0]))
        x_label = Text("chance of heads", color="#75674f", font_size=17).next_to(axes, DOWN, buff=.25)
        endpoints = VGroup(Text("0", color="#75674f", font_size=16).next_to(axes.c2p(0, 0), DOWN), Text("1", color="#75674f", font_size=16).next_to(axes.c2p(1, 0), DOWN))
        self.play(FadeIn(title), FadeIn(subtitle), Create(axes), FadeIn(x_label), FadeIn(endpoints), run_time=1)
        self.play(Create(graph), FadeIn(point), FadeIn(value), run_time=1.5)
        self.play(p.animate.set_value(.98), run_time=2)
        self.play(p.animate.set_value(.02), run_time=2.5)
        self.play(p.animate.set_value(.5), run_time=2)
        self.wait(1)
        self.play(*[FadeOut(item) for item in self.mobjects], run_time=1)
