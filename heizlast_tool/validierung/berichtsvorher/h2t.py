import re,sys,html
def conv(fn):
    s=open(fn,encoding='utf-8').read()
    s=re.sub(r'<style[^>]*>.*?</style>','',s,flags=re.S)
    s=re.sub(r'<script[^>]*>.*?</script>','',s,flags=re.S)
    s=re.sub(r'</(h1|h2|h3|h4|p|div|li|tr|nav|table|section)>','\n',s)
    s=re.sub(r'<(h1|h2|h3|h4)[^>]*>','\n\n### ',s)
    s=re.sub(r'<br\s*/?>','\n',s)
    s=re.sub(r'</t[dh]>',' | ',s)
    s=re.sub(r'<[^>]+>','',s)
    s=html.unescape(s)
    s=re.sub(r'[ \t]+',' ',s)
    s=re.sub(r' *\n *','\n',s)
    s=re.sub(r'\n{3,}','\n\n',s)
    return s.strip()
for fn in sys.argv[1:]:
    t=conv(fn)
    out=fn.rsplit('.',1)[0]+'.txt'
    open(out,'w',encoding='utf-8').write(t)
    heads=re.findall(r'^### (.+)$',t,flags=re.M)
    print(out, len(t),'Zeichen,',len(heads),'Überschriften')
