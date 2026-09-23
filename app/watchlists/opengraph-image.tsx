import {pageOgSize,watchlistsOgAlt,watchlistsShareImage} from '@/lib/page-share-image';

export const alt=watchlistsOgAlt;
export const size=pageOgSize;
export const contentType='image/png';

export default function Image(){
  return watchlistsShareImage();
}
