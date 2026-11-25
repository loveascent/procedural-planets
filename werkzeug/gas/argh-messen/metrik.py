import sys, base64, pathlib
from playwright.sync_api import sync_playwright
D = pathlib.Path(__file__).parent / "bilder"
JS = """async (u)=>{const im=new Image(); im.src=u; await im.decode(); const c=document.createElement('canvas'); c.width=300;c.height=300; const x=c.getContext('2d'); x.drawImage(im,420,260,300,300,0,0,300,300); const d=x.getImageData(0,0,300,300).data; const L=new Float32Array(90000); let m=0; for(let i=0;i<90000;i++){L[i]=(0.2126*d[i*4]+0.7152*d[i*4+1]+0.0722*d[i*4+2])/255; m+=L[i];} m/=90000; let s=0,n=0; for(let y=1;y<299;y++)for(let x2=1;x2<299;x2++){const i=y*300+x2; s+=Math.abs(4*L[i]-L[i-1]-L[i+1]-L[i-300]-L[i+300]); n++;} return [s/n/m, m];}"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True); pg = b.new_page()
    for n in sys.argv[1:]:
        u = "data:image/png;base64," + base64.b64encode((D / (n + ".png")).read_bytes()).decode()
        a, m = pg.evaluate(JS, u); print(f"{n:16s} Hochfrequenz/Helligkeit {a:.3f}  Helligkeit {m:.3f}")
    b.close()
