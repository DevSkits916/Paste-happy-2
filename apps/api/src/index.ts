import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { queueRouter } from './routes/queue.js';
import { templatesRouter } from './routes/templates.js';
import { logsRouter } from './routes/logs.js';
import { assistRouter } from './routes/assist.js';
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
// @version      1.1.0
// @description  Auto-paste text into FB group composer so user can hit Post
// @match        https://www.facebook.com/groups/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const logPrefix = '[Paste-Happy]';
  const log = (...args) => console.log(logPrefix, ...args);
  const warn = (...args) => console.warn(logPrefix, ...args);

  let parsedUrl;
  try {
    parsedUrl = new URL(window.location.href);
  } catch (error) {
    warn('Unable to parse window URL.', error);
    return;
  }

  if (parsedUrl.searchParams.get('ph') !== '1') {
    return;
  }

  log('Assist mode detected.');

  const COMPOSER_SELECTOR = '[contenteditable][role="textbox"]';
  const OBSERVER_TIMEOUT = 15000;

  const focusPostButton = () => {
    const buttons = Array.from(document.querySelectorAll('[role="button"], button'));
    const postButton = buttons.find((button) => {
      const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
      return /post/i.test(label);
    });

    if (!postButton) {
      warn('Post button not found.');
      return;
    }

    postButton.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      if (typeof postButton.focus === 'function') {
        postButton.focus({ preventScroll: true });
      }
    } catch (error) {
      try {
        postButton.focus();
      } catch (focusError) {
        warn('Unable to focus Post button.', focusError);
      }
    }

    log('Post button focused.');
  };

  const insertText = (composer, text) => {
    if (!composer) {
      return;
    }

    composer.focus();

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.addRange(range);
    }

    let inserted = false;
    try {
      if (typeof document.execCommand === 'function') {
        inserted = document.execCommand('insertText', false, text);
      }
    } catch (error) {
      warn('execCommand insertText failed.', error);
    }

    if (!inserted) {
      composer.textContent = text;
      try {
        composer.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            data: text,
            inputType: 'insertText'
          })
        );
      } catch (error) {
        // Ignore InputEvent support issues
      }
    }

    log('Composer filled.');
    focusPostButton();
  };

  const fillComposerWithClipboard = async (composer) => {
    if (!composer) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        warn('Clipboard is empty.');
        return;
      }

      insertText(composer, clipboardText);
    } catch (error) {
      warn('Unable to read clipboard.', error);
    }
  };

  const findComposer = () => document.querySelector(COMPOSER_SELECTOR);

  const existingComposer = findComposer();
  if (existingComposer) {
    void fillComposerWithClipboard(existingComposer);
    return;
  }

  const observer = new MutationObserver(() => {
    const composer = findComposer();
    if (composer) {
      observer.disconnect();
      void fillComposerWithClipboard(composer);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT);
  } else {
    warn('document.body not available.');
  }
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

app.use('/assist', requireAuth, assistRouter);
app.use('/auth', authRouter);
app.use('/queue', requireAuth, queueRouter);
app.use('/templates', requireAuth, templatesRouter);
app.use('/logs', requireAuth, logsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
