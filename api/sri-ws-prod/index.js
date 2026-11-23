import { createSriSoapHandler } from '../../server/domains/sriGateway.js';

export default createSriSoapHandler({
  hostname: 'cel.sri.gob.ec',
  label: 'SRI Producción'
});
