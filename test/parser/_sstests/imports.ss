import io
import http

io.stdout <- http.get("example.com")

requests <- http.server("localhost", 8080)
requests -> http.path("/ping") -> http.ok("pong")
