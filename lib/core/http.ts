import axios, { AxiosResponse } from 'axios';
import { IHttpConfig } from '../config';

export default (config: IHttpConfig) => {
  const axiosClient = axios.create(config);

  const getCageKey = (): Promise<string> =>
    axiosClient
      .get('/cages/key')
      .then((response: AxiosResponse) => response.data);
  const runCage = (cageName: string, payload: object): Promise<AxiosResponse> =>
    axiosClient.post(`/cages/${cageName}`, {
      data: payload,
    });

  return { getCageKey, runCage };
};
