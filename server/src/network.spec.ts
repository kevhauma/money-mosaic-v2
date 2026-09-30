import { describe, expect, it } from 'vitest';
import type os from 'node:os';

import { lanAddresses, startupUrls } from './network.js';

/**
 * An interface entry with only the fields `lanAddresses` reads. `os.NetworkInterfaceInfo` carries
 * six more (netmask, mac, cidr, scopeid...) that no assertion here would be about.
 */
const entry = (
  address: string,
  family: 'IPv4' | 'IPv6',
  internal: boolean,
): os.NetworkInterfaceInfo => ({ address, family, internal }) as unknown as os.NetworkInterfaceInfo;

describe('network: lanAddresses', () => {
  it('keeps the IPv4 addresses another machine could reach', () => {
    expect(
      lanAddresses({
        Ethernet: [entry('192.168.1.20', 'IPv4', false)],
        'Wi-Fi': [entry('10.0.0.7', 'IPv4', false)],
      }),
    ).toEqual(['10.0.0.7', '192.168.1.20']);
  });

  it('drops loopback and IPv6, which nobody is going to retype into a phone', () => {
    expect(
      lanAddresses({
        'Loopback Pseudo-Interface 1': [entry('127.0.0.1', 'IPv4', true)],
        Ethernet: [entry('192.168.1.20', 'IPv4', false), entry('fe80::1', 'IPv6', false)],
      }),
    ).toEqual(['192.168.1.20']);
  });

  it('survives an interface map with holes in it', () => {
    expect(lanAddresses({})).toEqual([]);
    expect(lanAddresses({ Ethernet: undefined })).toEqual([]);
  });

  it('reports one address once, however many interfaces claim it', () => {
    expect(
      lanAddresses({
        Ethernet: [entry('192.168.1.20', 'IPv4', false)],
        'Ethernet 2': [entry('192.168.1.20', 'IPv4', false)],
      }),
    ).toEqual(['192.168.1.20']);
  });
});

describe('network: startupUrls', () => {
  /**
   * The LAN URL being in this output is an acceptance criterion of TICKET-SRV-09, not a nicety:
   * it is the address the phone needs, and the person running the command cannot derive it.
   */
  it('names localhost first and then every LAN address, on the port it is listening on', () => {
    expect(startupUrls(4300, ['192.168.1.20'])).toEqual([
      'http://localhost:4300',
      'http://192.168.1.20:4300',
    ]);
  });

  it('still names localhost on a machine with no network', () => {
    expect(startupUrls(8080, [])).toEqual(['http://localhost:8080']);
  });
});
