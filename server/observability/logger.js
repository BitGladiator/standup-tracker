const winston = require('winston');

const isDev = process.env.NODE_ENV !== 'production';


const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? '\n' + JSON.stringify(meta, null, 2)
      : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);


const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: isDev ? devFormat : prodFormat,
  }),
];

if (!isDev) {
  transports.push(
    new winston.transports.File({
      filename: '/var/log/standup-tracker/error.log',
      level: 'error',
      format: prodFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: '/var/log/standup-tracker/combined.log',
      format: prodFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transports,
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});


logger.withRequest = (req) => {
  return logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.userId,
    ip: req.ip,
  });
};

module.exports = logger;