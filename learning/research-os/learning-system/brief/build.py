import os
os.environ.setdefault('MPLCONFIGDIR', '/tmp/bucket-brief-matplotlib')
import re
import json
from pathlib import Path
from xml.sax.saxutils import escape
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, XPreformatted, KeepTogether

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
FIGURES = HERE / 'figures'
OUTPUT = ROOT / 'output' / 'pdf' / 'bucket-learning-system-brief.pdf'
METRICS = json.loads((HERE.parent / 'analysis/results/metrics.json').read_text())
PALETTE = {'ink': '#1F1C16', 'paper': '#F4EDE2', 'muted': '#716A5A', 'gold': '#B8861E', 'teal': '#2E6B6B', 'green': '#5A7A3A', 'line': '#CFC5AF', 'pale': '#E5DECF'}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'text.color': PALETTE['ink'], 'axes.labelcolor': PALETTE['ink'], 'xtick.color': PALETTE['muted'], 'ytick.color': PALETTE['muted'], 'figure.facecolor': PALETTE['paper'], 'axes.facecolor': PALETTE['paper'], 'savefig.facecolor': PALETTE['paper']})


def save(fig, name):
    fig.savefig(FIGURES / f'{name}.png', dpi=240, bbox_inches='tight', pad_inches=.10)
    svg=FIGURES / f'{name}.svg'
    fig.savefig(svg, bbox_inches='tight', pad_inches=.10)
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
    plt.close(fig)


def node(ax, xy, label, detail, state='ready', width=1.5):
    x, y = xy
    color = PALETTE['green'] if state == 'known' else PALETTE['teal'] if state == 'ready' else PALETTE['muted']
    fill = color if state == 'known' else PALETTE['paper'] if state == 'ready' else PALETTE['pale']
    ax.add_patch(FancyBboxPatch((x-width/2, y-.3), width, .60, boxstyle='round,pad=0.03,rounding_size=.06', linewidth=1.6, edgecolor=color, facecolor=fill, zorder=4))
    ax.text(x, y+.045, label, ha='center', va='center', weight='bold', fontsize=10, color='white' if state == 'known' else color, zorder=5)
    ax.text(x, y-.16, detail, ha='center', va='center', fontsize=7.8, color='white' if state == 'known' else PALETTE['muted'], zorder=5)


def arrow(ax, start, end, color=None, style='-', shrink=0):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle='-|>', mutation_scale=12, linewidth=1.7, color=color or PALETTE['line'], linestyle=style, shrinkA=shrink, shrinkB=shrink, zorder=2))


def experience():
    fig, ax = plt.subplots(figsize=(8.3, 2.6))
    ax.set(xlim=(0, 8.3), ylim=(0, 2.6))
    ax.axis('off')
    ax.text(.1, 2.37, 'LEARN THIS', fontsize=9, weight='bold', color=PALETTE['gold'])
    ax.text(8.15, 2.37, '4 required   /   1 verified   /   3 remaining', ha='right', fontsize=9)
    points = [(1.1, 1.14), (3.75, 1.68), (3.75, .58), (6.6, 1.14)]
    for a, b in [(0,1),(0,2),(1,3),(2,3)]:
        arrow(ax, points[a], points[b], PALETTE['teal'], shrink=47)
    node(ax, points[0], 'Foundation F', 'Verified mastery', 'known', 1.65)
    node(ax, points[1], 'Concept A', 'Ready to learn')
    node(ax, points[2], 'Concept B', 'Ready to learn')
    node(ax, points[3], 'Target T', 'Needs A and B', 'blocked', 1.65)
    ax.text(4.1, .01, 'Proposed chart state. Both branches are mandatory.', ha='center', fontsize=8.5, color=PALETTE['muted'])
    save(fig, '01-experience')


def shortest_path():
    fig, axes = plt.subplots(1, 2, figsize=(8.3, 2.65), gridspec_kw={'width_ratios': [1, 1.45]})
    ax, right = axes
    ax.set(xlim=(0, 4.1), ylim=(0, 3))
    ax.axis('off')
    pts = {'F': (.45, 1.45), 'A': (1.85, 2.22), 'B': (1.85, .67), 'T': (3.3, 1.45)}
    for a, b in [('F','A'),('F','B'),('A','T'),('B','T')]:
        arrow(ax, pts[a], pts[b], PALETTE['teal'], shrink=16)
    for label, (x,y) in pts.items():
        ax.scatter(x,y,s=650,facecolor=PALETTE['paper'],edgecolor=PALETTE['teal'],linewidth=2,zorder=4)
        ax.text(x,y,label,ha='center',va='center',weight='bold',zorder=5)
    ax.text(1.85, 2.88, 'CONCEPT GRAPH', ha='center', fontsize=9, weight='bold')
    ax.text(1.85, .0, 'F → A → T omits B', ha='center', fontsize=9, color=PALETTE['gold'])
    right.axis('off')
    right.set(xlim=(0, 5.2), ylim=(0, 3))
    right.text(.0, 2.88, 'SHORTEST KNOWLEDGE-STATE PATH', fontsize=9, weight='bold')
    states = ['∅', '{F}', '{F,A}', '{F,A,B}', '{F,A,B,T}']
    for index, label in enumerate(states):
        x = .15 + index*1.12
        right.text(x,1.65,label,ha='center',va='center',fontsize=8.8,weight='bold')
        if index < 4:
            arrow(right,(x+.22,1.28),(x+.88,1.28),PALETTE['gold'])
    right.text(2.15,.52,'4 transitions = 4 required new concepts',ha='center',fontsize=10,color=PALETTE['teal'])
    right.text(2.15,.08,'Start: empty mastery   |   End: target reached',ha='center',fontsize=8,color=PALETTE['muted'])
    fig.subplots_adjust(wspace=.16)
    save(fig, '02-shortest-path')


def knowledge_region():
    fig, axes = plt.subplots(1, 2, figsize=(8.3, 2.8), gridspec_kw={'width_ratios':[1,1.25]})
    ax, right = axes
    milestones = METRICS['axes']['milestones']
    ax.add_patch(Rectangle((0,0),1,1,facecolor=PALETTE['pale'],edgecolor=PALETTE['line'],linewidth=1))
    ax.add_patch(Rectangle((0,0),2/3,2/3,facecolor=PALETTE['teal'],alpha=.16))
    xs, ys = zip(*(m['coordinates'] for m in milestones))
    ax.plot(xs,ys,color=PALETTE['teal'],marker='o',linewidth=2.2,markersize=6)
    for (x,y), label, dx,dy in zip(zip(xs,ys), ['None','a','a + b','a + b + t'], [.03,.04,-.3,-.35], [.07,.05,.07,-.12]):
        ax.text(x+dx,y+dy,label,fontsize=8.8)
    ax.set(xlim=(-.02,1.08),ylim=(-.02,1.1),xlabel='Primitive axis a',ylabel='Primitive axis b',xticks=[0,2/3,1],yticks=[0,2/3,1])
    ax.set_xticklabels(['0','2/3','1'])
    ax.set_yticklabels(['0','2/3','1'])
    ax.set_aspect('equal')
    ax.spines[['top','right']].set_visible(False)
    right.barh(['None','a','a + b','a + b + t'],[m['coverage'] for m in milestones],color=[PALETTE['line'],PALETTE['gold'],PALETTE['teal'],PALETTE['green']],height=.5)
    right.invert_yaxis()
    right.set(xlim=(0,1.16),xticks=[0,1/3,2/3,1],xlabel='Confirmed catalog coverage G')
    right.set_xticklabels(['0','1/3','2/3','1'])
    for i,m in enumerate(milestones):
        right.text(m['coverage']+.025,i,f"{m['coverage']:.0%}",va='center',fontsize=9)
    right.spines[['top','right','left']].set_visible(False)
    right.tick_params(axis='y',length=0)
    fig.subplots_adjust(wspace=.45,bottom=.2)
    save(fig,'03-knowledge-region')


def validation():
    fig, axes = plt.subplots(1,2,figsize=(8.3,2.7),gridspec_kw={'width_ratios':[1,1.2]})
    left,right=axes
    values=[METRICS['statistics']['models'][k]['brier'] for k in ['intercept','item_baseline','prerequisite_axis']]
    left.barh(['Intercept','Item effects','Axis + prereq'],values,color=[PALETTE['line'],PALETTE['gold'],PALETTE['teal']],height=.5)
    left.invert_yaxis()
    for i,v in enumerate(values):
        left.text(v+.008,i,f'{v:.5f}',va='center',fontsize=9)
    left.set(xlim=(0,.33),xlabel='Brier score · lower is better',xticks=[0,.1,.2,.3])
    left.spines[['top','right','left']].set_visible(False)
    left.tick_params(axis='y',length=0)
    for i,key in enumerate(['planted_shared_latent','control']):
        result=METRICS['statistics']['residual_correlations'][key]
        p=result['correlation']
        lo,hi=result['bonferroni_97_5_percent_bootstrap_interval']
        right.errorbar(p,i,xerr=[[p-lo],[hi-p]],fmt='o',capsize=5,color=PALETTE['teal'] if i==0 else PALETTE['gold'],linewidth=2)
        right.text(.43,i,f"p={result['holm_adjusted_p']:.3f}",va='center',fontsize=8.5)
    right.axvline(0,color=PALETTE['muted'],linewidth=1,linestyle=':')
    right.set(xlim=(-.25,.64),ylim=(-.7,1.7),yticks=[0,1],yticklabels=['Planted pair','Control'],xlabel='Residual correlation')
    right.invert_yaxis()
    right.spines[['top','right','left']].set_visible(False)
    right.tick_params(axis='y',length=0)
    fig.subplots_adjust(wspace=.58,bottom=.2)
    save(fig,'04-validation')


def formula_image(expression,index):
    fig=plt.figure(figsize=(9,.62))
    fig.text(.5,.5,f'${expression}$',ha='center',va='center',fontsize=14,color=PALETTE['teal'])
    destination=FIGURES/f'equation-{index}.png'
    fig.savefig(destination,dpi=240,bbox_inches='tight',pad_inches=.09)
    plt.close(fig)
    return destination


def markup(text):
    text=escape(text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`([^`]+)`',r'<font name="Mono">\1</font>',text)
    text=re.sub(r'\[([^\]]+)\]\((https?[^)]+)\)',r'<link href="\2" color="#2E6B6B">\1</link>',text)
    return text


def header(canvas,doc):
    width,height=doc.pagesize
    canvas.saveState()
    canvas.setFillColor(colors.HexColor(PALETTE['paper']))
    canvas.rect(0,0,width,height,fill=1,stroke=0)
    canvas.setFont('SansBold',8)
    canvas.setFillColor(colors.HexColor(PALETTE['teal']))
    canvas.drawString(48,height-32,'BUCKET  /  LEARNING SYSTEM')
    canvas.setFillColor(colors.HexColor(PALETTE['muted']))
    canvas.setFont('Sans',7.5)
    canvas.drawRightString(width-48,height-32,'25 SEP 2026')
    canvas.setStrokeColor(colors.HexColor(PALETTE['line']))
    canvas.line(48,40,width-48,40)
    canvas.drawString(48,26,'IMPLEMENTATION BRIEF  ·  FORMAL MODEL + SYNTHETIC EVIDENCE')
    canvas.drawRightString(width-48,26,f'{doc.page} / 6')
    canvas.restoreState()


def build():
    FIGURES.mkdir(exist_ok=True)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    experience()
    shortest_path()
    knowledge_region()
    validation()
    fonts=Path(matplotlib.get_data_path())/'fonts'/'ttf'
    for alias,name in [('Sans','DejaVuSans.ttf'),('SansBold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf'),('Mono','DejaVuSansMono.ttf')]:
        pdfmetrics.registerFont(TTFont(alias,str(fonts/name)))
    pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='SansBold',italic='Sans',boldItalic='SansBold')
    body=ParagraphStyle('Body',fontName='Sans',fontSize=10.0,leading=14,textColor=colors.HexColor(PALETTE['ink']),spaceAfter=7)
    title=ParagraphStyle('Title',fontName='Serif',fontSize=25,leading=30,textColor=colors.HexColor(PALETTE['ink']),spaceAfter=12)
    caption=ParagraphStyle('Caption',parent=body,fontSize=8,leading=11,textColor=colors.HexColor(PALETTE['muted']),spaceAfter=11)
    code=ParagraphStyle('Code',fontName='Mono',fontSize=7.15,leading=10.5,textColor=colors.HexColor(PALETTE['ink']),backColor=colors.HexColor('#E8E2D6'),borderPadding=9,spaceBefore=4,spaceAfter=14)
    kicker=ParagraphStyle('Kicker',fontName='SansBold',fontSize=8,leading=12,textColor=colors.HexColor(PALETTE['gold']),spaceAfter=6)
    source=(HERE/'BRIEF.md').read_text()
    lean=re.search(r'```lean\n(.*?)\n```',source,re.S).group(1)
    assert lean in (HERE.parent/'lean/LearningSystem.lean').read_text()
    assert len(source.split())<=2000
    sections=re.split(r'^## ',source,flags=re.M)[1:]
    assert len(sections)==6
    tags=['PROPOSED EXPERIENCE','MINIMUM REQUIREMENTS','COMPILED LEAN PROOF','VERSIONED KNOWLEDGE COVERAGE','SYNTHETIC VALIDATION','CRITIC REVIEW AND DELIVERY']
    story=[]
    equation=0
    for page,section in enumerate(sections):
        heading,content=section.split('\n',1)
        if page:
            story.append(PageBreak())
        story.extend([Paragraph(f'{page+1:02d}  /  {tags[page]}',kicker),Paragraph(heading,title)])
        blocks=re.split(r'\n\s*\n',content.strip())
        for block in blocks:
            if block.startswith('```'):
                lines=block.splitlines()[1:-1]
                story.append(XPreformatted(escape('\n'.join(lines)),code))
            elif block.startswith('$$'):
                equation+=1
                destination=formula_image(block[2:-2],equation)
                img=Image(str(destination))
                scale=min(1,516/(img.imageWidth*72/240))
                img.drawWidth=img.imageWidth*72/240*scale
                img.drawHeight=img.imageHeight*72/240*scale
                story.append(img)
                story.append(Spacer(1,3))
            elif block.startswith('!['):
                match=re.match(r'!\[(.*?)\]\((.*?)\)',block,re.S)
                img=Image(str(HERE/match.group(2)))
                img.drawHeight=516*img.imageHeight/img.imageWidth
                img.drawWidth=516
                if page==3 and img.drawHeight>145:
                    img.drawWidth*=145/img.drawHeight
                    img.drawHeight=145
                story.append(KeepTogether([img,Paragraph(markup(match.group(1)),caption)]))
            else:
                story.append(Paragraph(markup(block.replace('\n',' ')),body))
    doc=SimpleDocTemplate(str(OUTPUT),pagesize=(612,792),leftMargin=48,rightMargin=48,topMargin=56,bottomMargin=54,title='Bucket learning system: brief and Lean proof',author='Bucket Foundation')
    doc.build(story,onFirstPage=header,onLaterPages=header)
    print(json.dumps({'pdf':str(OUTPUT),'source_words':len(source.split()),'sections':len(sections),'proof_excerpt_matches_source':True}))


if __name__=='__main__':
    build()
