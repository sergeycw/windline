export const QUEUE_WEATHER_FETCH = 'weather_fetch';
export const QUEUE_IMAGE_RENDER = 'image_render';

export interface WeatherFetchJobData {
  requestId: string;
}

export interface ImageRenderJobData {
  requestId: string;
}
