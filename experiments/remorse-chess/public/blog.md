---
title: Remorse Chess
description: Every capture has a consequence. A playable chess variant where pieces feel remorse and bishops grant absolution.
cover_image: assets/cover.png
social_image: assets/cover.png
social_image_width: 1200
social_image_height: 630
---

# Chess with a conscience

Capture a pawn with your rook. In ordinary chess, the rook keeps going. In Remorse Chess, it feels guilty. It can still move and block, but it cannot capture again until a friendly bishop moves beside it and grants absolution.

That one change makes bishops feel very different. A bishop is both a diagonal attacker and the piece that can bring your other attackers back into the game. Losing both bishops means every future capture has a lasting cost.

[Play Remorse Chess in the lab →](/lab/remorse-chess/)

## How to play

Tap a piece, then a highlighted square. Pieces marked with an orange ring are remorseful. Move one of your bishops to any of the eight squares surrounding a guilty ally to forgive it. A green flash marks absolution.

The game opens against the computer. Use **New game** to choose your colour, change the computer's level, or switch to two players sharing the same board. You can undo, flip the board, and turn on sound. Progress saves in your browser.

If the rule feels unusual, try the guided example. It pauses your current game, walks through a capture and a bishop's absolution, then returns you to the same position.

## The details matter

A remorseful piece cannot capture, so it normally cannot give check either. That changes which squares a king can enter. Moving a bishop can suddenly restore a rook's attack. The rules engine calculates legal moves after these changes, rather than applying a capture restriction to an ordinary chess board.

This version uses a literal bishop-move rule: walking a guilty piece next to a stationary bishop does not absolve it. Bishops can feel remorse and still forgive others, but cannot forgive themselves. Promotion retains remorse, and kings always remain on non-adjacent squares. The complete implementation rulings are available under **Rules** in the game.

## A small browser experiment

The game uses plain JavaScript, CSS and original SVG pieces. The computer searches in a Web Worker to keep the board responsive. The rules engine has automated coverage for the variant mechanics and ordinary chess edge cases, including castling, en passant, promotion, draws and undo snapshots.

The computer is a lightweight opponent for exploring the variant. It is not a rated chess engine. Local two-player mode works on the same device; online multiplayer is not part of this version.

## Inspiration and source

Remorse Chess was popularized by [Bardelo Bardalini](https://www.youtube.com/shorts/H-JyKN_1jM4). The core rule is also described in [Neatorama's introduction](https://www.neatorama.com/2026/11/16/Remorse-Chess-When-Your-Pieces-Feel-Guilty/). The edge cases above are explicit choices for this browser implementation.

[Read the public source on GitHub →](https://github.com/monabbous/nabous.dev/tree/master/experiments/remorse-chess)
