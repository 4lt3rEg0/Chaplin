from pathlib import Path
import os
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).parent
source = root.parent / 'liquid-chrome-concept-v1.png'
rgb = np.array(Image.open(source).convert('RGB'))
donor_path = os.getenv('CHAPLIN_LIQUID_CHROME_DONOR')
if not donor_path:
    raise RuntimeError('Set CHAPLIN_LIQUID_CHROME_DONOR to the local donor image before running this verification tool.')
donor = np.array(Image.open(Path(donor_path).expanduser()).convert('RGB'))
h, w = rgb.shape[:2]
# A narrow uncertain band follows the external shell. Interior chrome, dark
# reflections and display are definite foreground, never color-keyed away.
points = np.array([(88,157),(108,125),(147,91),(198,74),(249,76),(311,86),(405,103),(500,111),(600,101),(688,85),(785,83),(900,88),(1040,96),(1154,112),(1260,111),(1370,90),(1460,74),(1520,70),(1585,87),(1629,119),(1656,168),(1674,238),(1673,343),(1675,422),(1692,506),(1703,590),(1697,664),(1674,718),(1630,757),(1556,785),(1475,801),(1371,798),(1280,783),(1180,766),(1060,765),(952,778),(832,782),(723,779),(622,770),(511,769),(407,778),(301,783),(214,781),(141,758),(96,714),(72,662),(65,607),(76,529),(88,474),(94,419),(91,353),(79,286),(78,213)],np.int32)
rough=np.zeros((h,w),np.uint8);cv2.fillPoly(rough,[points],255)
kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(35,35))
inside=cv2.erode(rough,kernel);outside=cv2.dilate(rough,kernel)
mask=np.full((h,w),cv2.GC_BGD,np.uint8)
mask[outside>0]=cv2.GC_PR_BGD;mask[rough>0]=cv2.GC_PR_FGD;mask[inside>0]=cv2.GC_FGD
cv2.grabCut(cv2.cvtColor(donor,cv2.COLOR_RGB2BGR),mask,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
alpha=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
contours,_=cv2.findContours(alpha,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
alpha[:]=0;cv2.drawContours(alpha,[max(contours,key=cv2.contourArea)],-1,255,cv2.FILLED)
alpha=cv2.morphologyEx(alpha,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(23,23)))
alpha=cv2.GaussianBlur(alpha,(15,15),3)
alpha=np.clip((alpha.astype(float)-110)*255/35,0,255).astype(np.uint8)
# Remove the original baked pointer only. Its animated replacement is DOM.
pointer=np.zeros((h,w),np.uint8)
cv2.line(pointer,(1364,487),(1375,554),255,24)
ys,xs=np.where(pointer>0)
center=(int((xs.min()+xs.max())/2),int((ys.min()+ys.max())/2))
blend=cv2.GaussianBlur(pointer,(15,15),3).astype(float)[:,:,None]/255
clean=np.round(rgb*(1-blend)+donor*blend).astype(np.uint8)
rgba=np.dstack([clean,alpha]);rgba[alpha==0,:3]=0
Image.fromarray(rgba).save(root/'liquid-chrome-transparent.png')
background=Image.new('RGBA',(w,h),(111,49,132,255));background.alpha_composite(Image.fromarray(rgba));background.convert('RGB').save(root/'cutout-review.png')
print({'size':[w,h],'transparent_pixels':int((alpha==0).sum()),'opaque_pixels':int((alpha==255).sum()),'corners':[int(alpha[y,x]) for y,x in [(0,0),(0,w-1),(h-1,0),(h-1,w-1)]]})
