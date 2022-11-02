import http from "http";

import { Server as WebSocketServer } from "ws";
import { EventEmitter } from "events";

function prepareApp(app) {
  const oldListen = app.listen.bind(app);

  app.listen = function (...args) {
    const server = oldListen(...args);

    const proxyServer = new EventEmitter();
    const wsServer = new WebSocketServer({ server: proxyServer });

    server.on("upgrade", function (req, socket, head) {
      const res = new http.ServerResponse(req);
      res.assignSocket(socket);

      res.upgradeWs = function (handler) {
        req._wsHandler = handler;
        proxyServer.emit("upgrade", req, socket, head);
      };

      app.handle(req, res);
    });

    wsServer.on("connection", function (ws, req) {
      req._wsHandler(ws);
    });

    return server;
  };
}

export default function (router) {
  if ("mountpath" in router) { // if(router is the app object)
    prepareApp(router);
  }

  router.ws = function (path, middleware) {
    return router.get(path, (req, res, next) => {
      res.upgradeWs(function (ws) {
        middleware(ws, req, next);
      });
    });
  };

  return router;
}
