from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root=Path(__file__).parent
source=Path(r'C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\src\components\ProfilePlayer\renderConcepts\liquid-chrome\liquid-chrome-concept-v1.png')
rgb=np.array(Image.open(source).convert('RGB'))
# Reuse the original previous button's metal, bevel and lighting, only
# removing the baked transport glyph so the mode icon can change in React.
crop=rgb[518:678,267:427].copy()
mask=np.zeros(crop.shape[:2],np.uint8)
cv2.rectangle(mask,(36,57),(106,102),255,-1)
clean=cv2.inpaint(crop,mask,7,cv2.INPAINT_TELEA)
alpha=Image.new('L',(640,640),0)
from PIL import ImageDraw
ImageDraw.Draw(alpha).ellipse((0,0,639,639),fill=255)
alpha=alpha.resize((160,160),Image.Resampling.LANCZOS)
result=Image.fromarray(clean).convert('RGBA');result.putalpha(alpha)
result.save(root/'mode-button.png')
print('Mode button: original PNG metal, transparent circular sprite.')
