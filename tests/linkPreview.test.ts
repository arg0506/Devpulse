import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, parseOpenGraph } from '../backend/linkPreview';

test('public addresses are allowed', () => {
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('loopback, private, link-local and reserved addresses are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.5', '172.31.255.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ['::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
});

test('172.x outside the private range is public', () => {
  assert.equal(isPublicAddress('172.32.0.1'), true);
});

test('Open Graph fields are read from the page', () => {
  const html = `<html><head>
    <title>Fallback title</title>
    <meta property="og:title" content="Hello &amp; welcome">
    <meta property="og:description" content="A short description">
    <meta property="og:site_name" content="Example">
    <meta property="og:image" content="/cover.png">
  </head></html>`;
  const preview = parseOpenGraph(html, 'https://example.com/post/1');
  assert.equal(preview.title, 'Hello & welcome');
  assert.equal(preview.description, 'A short description');
  assert.equal(preview.siteName, 'Example');
  assert.equal(preview.image, 'https://example.com/cover.png');
});

test('the page title is used when there is no Open Graph title', () => {
  const preview = parseOpenGraph('<title>Plain page</title>', 'https://example.com/');
  assert.equal(preview.title, 'Plain page');
  assert.equal(preview.image, undefined);
});

test('an image that is not a web link is dropped', () => {
  const html = '<meta property="og:image" content="javascript:alert(1)">';
  assert.equal(parseOpenGraph(html, 'https://example.com/').image, undefined);
});
