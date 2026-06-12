# Local dev server with caching disabled, so a plain reload always shows
# the latest files. Run: python3 serve.py [port]
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    # Bind 127.0.0.1 explicitly: a wildcard bind leaves the loopback address
    # free for VS Code's port auto-forwarding to claim, which then shadows
    # this server and hangs every localhost request.
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler).serve_forever()
