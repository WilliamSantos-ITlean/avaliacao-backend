/** 2 MB inclusive. O validador do Nest usa `size < max`, então o pipe recebe este valor + 1. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const IMAGE_MIME = /^image\/(jpeg|png)$/;

export const IMAGE_REQUIRED = 'Envie uma imagem no campo file';
export const IMAGE_TOO_BIG = 'A imagem pode ter no máximo 2 MB';
export const IMAGE_WRONG_TYPE = 'Só são aceitas imagens JPEG e PNG';
