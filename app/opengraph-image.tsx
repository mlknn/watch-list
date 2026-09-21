import {homeOgAlt,homeOgSize,homeShareImage} from '@/lib/home-share-image';

export const alt=homeOgAlt;
export const size=homeOgSize;
export const contentType='image/png';

export default function Image(){
  return homeShareImage();
}
