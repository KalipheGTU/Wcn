"""Accès réseau avec secours DNS : si le DNS du système échoue (« getaddrinfo failed »), le nom est résolu via DNS-over-HTTPS
(1.1.1.1 / 8.8.8.8, par adresse IP) puis la connexion HTTPS est établie directement sur l'IP trouvée (certificat vérifié sur le nom)."""
import http.client, io, json, socket, ssl, urllib.error, urllib.parse, urllib.request

UA = "KalipheTiles/1.0 (desktop georeferencing app)"
_doh_cache = {}
_ctx = None          # contexte SSL de secours (tests)

class _IPConn(http.client.HTTPSConnection):
    def __init__(self, host, ip, port=443, timeout=30):
        super().__init__(host, port, timeout=timeout); self._ip = ip
    def connect(self):
        s = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = (_ctx or ssl.create_default_context()).wrap_socket(s, server_hostname=self.host)

def _req_ip(host, ip, path, method="GET", body=None, headers=None, timeout=30):
    c = _IPConn(host, ip, timeout=timeout)
    try:
        c.request(method, path, body, headers or {}); r = c.getresponse()
        return r.status, r.getheader("Content-Type", ""), r.read(), r.getheader("Location")
    finally: c.close()

def doh_resolve(host):
    if host in _doh_cache: return _doh_cache[host]
    for dhost, ip, path in (("cloudflare-dns.com", "1.1.1.1", "/dns-query?name={h}&type=A"), ("dns.google", "8.8.8.8", "/resolve?name={h}&type=A")):
        try:
            st, ct, data, _ = _req_ip(dhost, ip, path.format(h=host), headers={"accept": "application/dns-json", "User-Agent": UA}, timeout=8)
            ips = [a["data"] for a in json.loads(data).get("Answer", []) if a.get("type") == 1]
            if ips: _doh_cache[host] = ips; return ips
        except Exception: continue
    return []

def _via_doh(url, headers, data, method, timeout, orig, hops):
    u = urllib.parse.urlparse(url); ips = doh_resolve(u.hostname)
    if not ips: raise orig
    path = (u.path or "/") + ("?" + u.query if u.query else "")
    for ip in ips:
        try: st, ct, body, loc = _req_ip(u.hostname, ip, path, method, data, headers, timeout)
        except Exception: continue
        if st in (301, 302, 307, 308) and loc and hops < 4:
            return fetch(urllib.parse.urljoin(url, loc), headers, data, method, timeout, hops + 1)
        if st >= 400: raise urllib.error.HTTPError(url, st, "HTTP", {}, io.BytesIO(body))
        return st, ct.split(";")[0].strip(), body
    raise orig

def fetch(url, headers=None, data=None, method="GET", timeout=30, hops=0):
    """Retourne (statut, content-type, corps). Lève urllib.error.HTTPError / URLError."""
    h = {"User-Agent": UA}; h.update(headers or {})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=h), timeout=timeout) as r:
            return r.status, r.headers.get_content_type(), r.read()
    except urllib.error.HTTPError: raise
    except urllib.error.URLError as e:
        if isinstance(e.reason, socket.gaierror) and url.startswith("https://"):
            return _via_doh(url, h, data, method, timeout, e, hops)
        raise
