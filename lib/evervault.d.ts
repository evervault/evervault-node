declare module '@evervault/sdk' {
  type PCRs = { pcr0?: string; pcr1?: string; pcr2?: string; pcr8?: string };
  type AttestationData = PCRs | PCRs[];
  type AttestationCallback = () => Promise<AttestationData>;

  export default class Evervault {
    constructor(appId: string, apiKey: string);
    encrypt: (data: any) => Promise<any>;
    decrypt: (encryptedData: any) => Promise<any>;
    createClientSideDecryptToken: (
      payload: any,
      expiry?: Date
    ) => Promise<{ id: string; token: string; createdAt: Date; expiry: Date }>;
    run: <T>(
      functionName: string,
      data: object,
      options?: { async?: boolean; version?: string }
    ) => Promise<{ result: T; runId: string; appUuid: string }>;
    createRunToken: (
      functionName: string,
      data: object
    ) => Promise<{ token: string }>;
    enableOutboundRelay: (options: {
      decryptionDomains: string[];
      debugRequests: boolean;
    }) => Promise<void>;
    /**
     * @deprecated use enableCages instead
     */
    enableCagesBeta: (
      cageAttestationData: Record<
        string,
        | { pcr0?: string; pcr1?: string; pcr2?: string; pcr8?: string }
        | { pcr0?: string; pcr1?: string; pcr2?: string; pcr8?: string }[]
      >
    ) => Promise<void>;
    createRelayHttpsAgent: () => HttpsProxyAgent;
    /**
     * @deprecated use enableEnclaves instead
     */
    enableCages: (
      cageAttestationData: Record<
        string,
        | { pcr0?: string; pcr1?: string; pcr2?: string; pcr8?: string }
        | { pcr0?: string; pcr1?: string; pcr2?: string; pcr8?: string }[]
      >
    ) => Promise<void>;
    enableEnclaves: (
      attestationData: Record<string, AttestationData | AttestationCallback>
    ) => Promise<void>;
  }
}
