const pino = require('pino');
const transport = pino.transport({
	targets: [
    { target: 'pino-pretty', level: 'debug', options: { colorize: false, destination: './eris.log' }},
    { target: 'pino-pretty', level: 'info' },
  ],
  dedupe: true
});
const logger = pino(transport);
module.exports = logger;

