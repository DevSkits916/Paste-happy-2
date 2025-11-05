import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { queueRouter } from './routes/queue.js';
import { templatesRouter } from './routes/templates.js';
import { logsRouter } from './routes/logs.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/assist/userscript', (_req, res) => {
  res.type('text/javascript');
  res.send(`// ==UserScript==
// @name         Paste-Happy FB Group Helper
// @namespace    https://tokensntokin.dev
// @version      1.0
// @description  Auto-paste text into FB group composer so user can hit Post
// @match        https://www.facebook.com/groups/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  const url = new URL(window.location.href);
  if (url.searchParams.get('ph') !== '1') {
    return;
  }
  console.log('[Paste-Happy] detected assist mode.');

  const focusPostButton = () => {
    const postButton = Array.from(document.querySelectorAll('[role="button"], button'))
      .find((btn) => /post/i.test(btn?.textContent ?? ''));
    if (postButton) {
      postButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        postButton.focus();
      } catch (error) {
        // ignore focus errors
      }
      console.log('[Paste-Happy] Post button focused.');
    }
  };

  const fillComposer = (composer) => {
    console.log('[Paste-Happy] Composer found.');
    navigator.clipboard
      .readText()
      .then((clipboardText) => {
        const text = clipboardText ?? '';
        composer.focus();
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(composer);
          selection.addRange(range);
        }
        document.execCommand('insertText', false, text);
        console.log('[Paste-Happy] Text inserted.');
        focusPostButton();
      })
      .catch((error) => {
        console.error('[Paste-Happy] Unable to read clipboard.', error);
      });
  };

  const findComposer = () => document.querySelector('[contenteditable="true"][role="textbox"]');

  const existingComposer = findComposer();
  if (existingComposer) {
    fillComposer(existingComposer);
    return;
  }

  const observer = new MutationObserver(() => {
    const composer = findComposer();
    if (composer) {
      observer.disconnect();
      fillComposer(composer);
    }
  });

  const root = document.body;
  if (!root) {
    console.warn('[Paste-Happy] Unable to locate document.body.');
    return;
  }

  observer.observe(root, { childList: true, subtree: true });
})();
`);
});

app.get('/settings', (req, res) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(',')[0] ?? req.protocol;
  const baseUrl = `${protocol}://${req.get('host')}`;
  const userscriptUrl = `${baseUrl.replace(/\/$/, '')}/assist/userscript`;
  const instructions = [
    'Paste-Happy Settings',
    `Userscript download URL: ${userscriptUrl}`,
    '',
    'Installation steps:',
    '1. Install a userscript manager such as Tampermonkey.',
    '2. Visit the download URL above and approve the installation prompt.',
    '3. In Paste-Happy, click “Copy & Open” on a group queue item.',
    '4. The helper will paste your ad automatically so you can press Enter or click Post.'
  ].join('\n');

  res.type('text/plain').send(instructions);
});

app.use('/auth', authRouter);
app.use('/queue', requireAuth, queueRouter);
app.use('/templates', requireAuth, templatesRouter);
app.use('/logs', requireAuth, logsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
