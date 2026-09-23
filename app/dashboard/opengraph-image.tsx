import {marketsOgAlt,marketsShareImage,pageOgSize} from '@/lib/page-share-image';

export const alt=marketsOgAlt;
export const size=pageOgSize;
export const contentType='image/png';

export default function Image(){
  return marketsShareImage();
}
