const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
  
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
  
      const color =
        statusCode >= 500 ? '\x1b[31m' : 
        statusCode >= 400 ? '\x1b[33m' : 
        statusCode >= 200 ? '\x1b[32m' : 
        '\x1b[0m';
  
      console.log(
        `${color}${method} ${url} ${statusCode}\x1b[0m — ${duration}ms — ${ip}`
      );
  
      if (duration > 500) {
        console.warn(`SLOW REQUEST: ${method} ${url} took ${duration}ms`);
      }
    });
  
    next();
  };
  
  module.exports = requestLogger;