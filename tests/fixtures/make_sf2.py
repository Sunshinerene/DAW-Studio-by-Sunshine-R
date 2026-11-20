import struct, math, sys
out = sys.argv[1]
def chunk(tag, data):
    if len(data)%2: data+=b'\0'
    return tag+struct.pack('<I',len(data))+data
def lst(typ, body): return chunk(b'LIST', typ+body)
def nm(s): return s.encode().ljust(20,b'\0')[:20]
N=2000
pcm=b''.join(struct.pack('<h',int(12000*math.sin(2*math.pi*i/50))) for i in range(N))+b'\0\0'*46
phdr=struct.pack('<20sHHHIII',nm('TestPiano'),0,0,0,0,0,0)+struct.pack('<20sHHHIII',nm('TestDrums'),0,128,1,0,0,0)+struct.pack('<20sHHHIII',nm('EOP'),0,0,2,0,0,0)
pbag=struct.pack('<HH',0,0)+struct.pack('<HH',1,0)+struct.pack('<HH',2,0)
pgen=struct.pack('<HH',41,0)+struct.pack('<HH',41,1)+struct.pack('<HH',0,0)
inst=struct.pack('<20sH',nm('PianoInst'),0)+struct.pack('<20sH',nm('DrumInst'),1)+struct.pack('<20sH',nm('EOI'),2)
ibag=struct.pack('<HH',0,0)+struct.pack('<HH',5,0)+struct.pack('<HH',8,0)
def g(op,v): return struct.pack('<Hh',op,v)
def gr(op,lo,hi): return struct.pack('<HBB',op,lo,hi)
igen=gr(43,0,127)+g(54,1)+g(38,-6000)+g(58,69)+g(53,0)
igen+=gr(43,36,36)+g(54,0)+g(53,0)
igen+=g(0,0)
shdr=struct.pack('<20sIIIIIBbHH',nm('Sine'),0,N,100,1900,22050,69,0,0,1)+struct.pack('<20sIIIIIBbHH',nm('EOS'),0,0,0,0,0,0,0,0,0)
info=lst(b'INFO',chunk(b'ifil',struct.pack('<HH',2,1))+chunk(b'INAM',b'Test\0\0'))
sdta=lst(b'sdta',chunk(b'smpl',pcm))
mod0=b'\0'*10
pdta=lst(b'pdta',chunk(b'phdr',phdr)+chunk(b'pbag',pbag)+chunk(b'pmod',mod0)+chunk(b'pgen',pgen)+chunk(b'inst',inst)+chunk(b'ibag',ibag)+chunk(b'imod',mod0)+chunk(b'igen',igen)+chunk(b'shdr',shdr))
body=b'sfbk'+info+sdta+pdta
open(out,'wb').write(b'RIFF'+struct.pack('<I',len(body))+body)
body3=b'sfbk'+lst(b'INFO',chunk(b'ifil',struct.pack('<HH',3,0)))+sdta+pdta
open(out.replace('.sf2','3.sf2'),'wb').write(b'RIFF'+struct.pack('<I',len(body3))+body3)
print('ok')
