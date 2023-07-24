declare module "@evervault/sdk" {
    export default class Evervault {
        constructor(apiKey: string)
        encrypt: (data: any) => Promise<any>;
        run: <T>(functionName: string, data: object, options?: { async?: boolean, version?: string }) => Promise<{ result: T, runId: string, appUuid: string }>;
        createRunToken: (functionName: string, data: object) => Promise<{ token: string }>;
        enableOutboundRelay: (options: { decryptionDomains: string[], debugRequests: boolean }) => Promise<void>;
        enableCagesBeta: (cageAttestationData: Record<string, { pcr0?: string, pcr1?: string, pcr2?: string, pcr8?: string }>) => Promise<void>;
    }
}
