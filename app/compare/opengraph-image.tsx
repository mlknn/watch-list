import {compareOgAlt,compareShareImage,pageOgSize} from '@/lib/page-share-image';

export const alt=compareOgAlt;
export const size=pageOgSize;
export const contentType='image/png';

export default function Image(){
  return compareShareImage();
}
