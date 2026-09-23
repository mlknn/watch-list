import {earningsOgAlt,earningsShareImage,pageOgSize} from '@/lib/page-share-image';

export const alt=earningsOgAlt;
export const size=pageOgSize;
export const contentType='image/png';

export default function Image(){
  return earningsShareImage();
}
