import Conf from 'conf';
import { Z402Config } from '../types/index;

const config = new Conf<Z402Config>({
  projectName: 'z402',
  defaults: {
    environment: 'testnet',
    apiUrl: 'https://api.z402.io',
    telemetry: true,
  },
});

export const getConfig = (): Z402Config => {
  return config.store;
};

export const setConfig = (key: keyof Z402Config, value: any): void => {
  config.set(key, value);
};

export const deleteConfig = (key: keyof Z402Config): void => {
  config.delete(key);
};

export const clearConfig = (): void => {
  config.clear();
};

export const hasApiKey = (): boolean => {
  return !!config.get('apiKey');
};

export const getApiKey = (): string | undefined => {
  return config.get('apiKey');
};

export const setApiKey = (apiKey: string): void => {
  config.set('apiKey', apiKey);
};

export const getMerchantId = (): string | undefined => {
  return config.get('merchantId');
};

export const setMerchantId = (merchantId: string): void => {
  config.set('merchantId', merchantId);
};

export const getEnvironment = (): 'testnet' | 'mainnet' => {
  return config.get('environment') || 'testnet';
};

export const setEnvironment = (env: 'testnet' | 'mainnet'): void => {
  config.set('environment', env);
};

export default config;
