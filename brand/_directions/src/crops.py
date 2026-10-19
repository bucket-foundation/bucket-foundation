from paths import DIRECTIONS_DIR
M=DIRECTIONS_DIR+"/licensed/marks/"
CROPS={"goat":("ainos-tetradrachm.png",(200,230,760,790)),"owl":("athens-tetradrachm-owl.png",(315,95,605,385)),"vessel":("exekias-amphora-met-250551.jpg",(-50,30,550,630)),"lyre":("kithara-attic.png",(470,0,960,490)),"mho":("stoichedon-inscription.png",None)}
def crop(key,px=500):
    from PIL import Image
    f,b=CROPS[key];im=Image.open(M+f).convert("RGB")
    if b is None: b=(0,0)+im.size
    c=Image.new("RGB",(b[2]-b[0],b[3]-b[1]),"white");c.paste(im,(-b[0],-b[1]))
    return c.resize((px,px))
