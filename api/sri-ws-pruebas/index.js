import { createSriSoapHandler } from '../../server/domains/sriGateway.js';

export default createSriSoapHandler({
  hostname: 'celcer.sri.gob.ec',
  label: 'SRI Pruebas'
});
