const relayOutboundResponse = {
  pollInterval: 5,
  data: {
    appUuid: 'app_5b849d3d269d',
    teamUuid: '2ef8d35ce668',
    strictMode: true,
    outboundDestinations: {
      'destination1.evervault.test': {
        id: 153,
        appUuid: 'app_5b849d3d269d',
        createdAt: '2022-10-07T10:14:18.597Z',
        updatedAt: '2022-10-07T10:14:18.597Z',
        deletedAt: null,
        routeSpecificFieldsToEncrypt: [],
        deterministicFieldsToEncrypt: [],
        encryptEmptyStrings: true,
        curve: 'secp256k1',
        uuid: 'outbound_destination_f0d7b61c8d52',
        destinationDomain: 'destination1.evervault.test',
      },
      '*.evervault.io': {
        id: 154,
        appUuid: 'app_5b849d3d269d',
        createdAt: '2022-10-07T11:18:39.447Z',
        updatedAt: '2022-10-07T11:18:39.447Z',
        deletedAt: null,
        routeSpecificFieldsToEncrypt: [],
        deterministicFieldsToEncrypt: [],
        encryptEmptyStrings: true,
        curve: 'secp256k1',
        uuid: 'outbound_destination_73a9b729f81e',
        destinationDomain: '*.evervault.io',
      },
      '*evervault.net': {
        id: 155,
        appUuid: 'app_5b849d3d269d',
        createdAt: '2022-10-07T11:18:39.447Z',
        updatedAt: '2022-10-07T11:18:39.447Z',
        deletedAt: null,
        routeSpecificFieldsToEncrypt: [],
        deterministicFieldsToEncrypt: [],
        encryptEmptyStrings: true,
        curve: 'secp256k1',
        uuid: 'outbound_destination_23afb729f81b',
        destinationDomain: '*evervault.net',
      },
    },
  },
};

module.exports = {
  relayOutboundResponse,
};
