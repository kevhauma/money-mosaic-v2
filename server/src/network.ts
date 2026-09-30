import os from 'node:os';

/**
 * The wildcard address the server listens on. `::` is the **dual-stack** wildcard: Node leaves
 * `ipv6Only` false, so one socket accepts both IPv6 and IPv4 clients, which is also what
 * `listen(port)` with no host does. It is named here rather than omitted because TICKET-SRV-09 is
 * about being reachable from the other machines in the house, and that is worth stating.
 *
 * **Not `0.0.0.0`**, which looks like the more permissive of the two and is the narrower: it is
 * IPv4-only, so it refuses `http://[::1]:4300` and anything resolving `localhost` to `::1` without
 * falling back. Neither one is the loopback bind — Node has never defaulted to that.
 */
export const HOST = '::';

/**
 * Every IPv4 address another machine on the network could reach this one on. Internal (loopback)
 * addresses are dropped because `localhost` is printed separately, and IPv6 is left out of the
 * *printed* list: an address somebody has to retype into a phone is worth keeping short. The
 * socket still accepts IPv6 — see `HOST`.
 *
 * Takes the interface map rather than reading it, so a spec can ask about a machine it is not
 * running on.
 */
export const lanAddresses = (
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): readonly string[] => {
  const found = new Set<string>();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) found.add(entry.address);
    }
  }
  return [...found].sort();
};

/**
 * The URLs to print at startup. `localhost` first because it is the one the person running the
 * command will use; the LAN addresses after it, because "open it on your phone" is the reason this
 * ticket exists and nobody guesses their own subnet.
 */
export const startupUrls = (port: number, addresses: readonly string[]): readonly string[] => [
  `http://localhost:${port}`,
  ...addresses.map((address) => `http://${address}:${port}`),
];
