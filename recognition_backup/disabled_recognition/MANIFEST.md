# Zenithsui Frozen Non-A/B Recognition Archive

## Overview
This archive preserves all code, datasets, model weights, specialist models, configurations, tests, and training scripts for frozen character classes:

- **Frozen Letters (C–Z)**: C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z (24 classes)
- **Frozen Digits (0–9)**: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 (10 classes)
- **Geometry & Symbols**: circle, ellipse, rectangle, triangle, line, arrow, checkmark, star, heart, cloud, etc.
- **Semantic Objects**: house, apple, lightbulb, tree, phone, camera, folder, etc. (20 classes)

## Active Targets in Zenithsui
- **A** (Letter A)
- **B** (Letter B)
- **UNKNOWN** (Rejected / Abstain)

## Preserved File Manifest & Hashes

| File Name | Category | Original Path | SHA256 Hash | Size (Bytes) |
| :--- | :--- | :--- | :--- | ---: |
| `orchestrator.ts` | source | `lib/sketch-recognition/orchestrator.ts` | `6ea31fbcb14c36af656ca162336cda6398aede083f3cb0bff911dfa9e7994929` | 12,517 |
| `handwriting-classifier.ts` | source | `lib/sketch-recognition/handwriting-classifier.ts` | `59bc2a65c1096be186a11b2580c03fd887dca3119076793fda9b27c913cd6d7e` | 16,889 |
| `sequence-engine.ts` | source | `lib/sketch-recognition/sequence-engine.ts` | `c8569940adddbf2709e4de702c267f6d320b5642766679a40702bfc67ea047e8` | 13,578 |
| `cnn-classifier.ts` | source | `lib/sketch-recognition/cnn-classifier.ts` | `45600e3e4c3ceecdb215a6bf30ab88a9abfe8bcd131d7a1ebea07f663ac06261` | 13,034 |
| `cnn-engine.ts` | source | `lib/sketch-recognition/cnn-engine.ts` | `bab0ba7ca9903d927120a993d6526613949cb87fc8afc1c692b93af3ce8697a7` | 22,952 |
| `cnn-rasterizer.ts` | source | `lib/sketch-recognition/cnn-rasterizer.ts` | `7c2a9e70551204fdeb5bca1144edeb9ef1dc351d2535537f79ee2d3e546ee8ea` | 4,979 |
| `geometry-recognizer.ts` | source | `lib/sketch-recognition/geometry-recognizer.ts` | `891bfc1f8d60c5166744f5fa05e618961b7d31bb993a6e0c002528686218a032` | 20,891 |
| `confidence-calibrator.ts` | source | `lib/sketch-recognition/confidence-calibrator.ts` | `61e09fedb72f5b29272b3c01f27d80c59b86bc4cd9a8e062904bdbbe7477c212` | 3,790 |
| `preprocessing.ts` | source | `lib/sketch-recognition/preprocessing.ts` | `2ea803b254149f96c265fe46dcf77c6c8470cb8ec7d0399dcb790c8444e487d2` | 10,220 |
| `renderers.ts` | source | `lib/sketch-recognition/renderers.ts` | `6224482686ce3f520159fa4288a733916621032ba6a1753a9328a1ea7c3c314f` | 29,872 |
| `registry.ts` | source | `lib/sketch-recognition/registry.ts` | `765f3d7bda08b70c25823acd2e56c56f2710989061a04c61484414428ae15ac6` | 8,453 |
| `types.ts` | source | `lib/sketch-recognition/types.ts` | `db23b55627a991cb838a678385ed19125847e89561115eff3a521c31bc703ca0` | 4,764 |
| `ai-recognizer.ts` | source | `lib/sketch-recognition/ai-recognizer.ts` | `18877e0c8ebe38394bfec61a414b4150bdd8a4bddd8cc99405a520513be09192` | 4,983 |
| `dataset-archetypes.ts` | datasets | `lib/sketch-recognition/dataset-archetypes.ts` | `34fa3e5e87206b16c3f80459a42fd5d2850a13a7eba4c7c9581409b17f0f80a0` | 22,284 |
| `dataset-generator.ts` | datasets | `lib/sketch-recognition/dataset-generator.ts` | `71651655b52839d11553a76ab4e69116cbaefe169443afce958e38f57f5904f5` | 6,108 |
| `handwriting-cnn.json` | models | `lib/sketch-recognition/models/handwriting-cnn.json` | `c8c11ec3f941cf7c6964c6d241683499f781b4eabfcc4e98b7bbafddc64fa6b2` | 1,564,056 |
| `geometry-cnn.json` | models | `lib/sketch-recognition/models/geometry-cnn.json` | `7f928f197a63234d62053a1315758ae35617fc123771f59ebfd6f68acf6f72c8` | 1,533,398 |
| `object-cnn.json` | models | `lib/sketch-recognition/models/object-cnn.json` | `99c0efa4e7a0a1c45503aefbb2d80ba66d6523c0858c7606f480bceed940aeea` | 1,537,566 |
| `class-definitions.ts` | specialists | `lib/sketch-recognition/specialists/class-definitions.ts` | `2c30edb995b2d2ac4ac27a71dc19cb1a592ef3fdf5b55a3a78bf39c3a38c836d` | 27,380 |
| `hard-negatives-matrix.ts` | specialists | `lib/sketch-recognition/specialists/hard-negatives-matrix.ts` | `f6a74b95b754052e1c06e5c133a76c9032a68d382bfd845ded78bfe4b92d7672` | 8,262 |
| `specialist-model.ts` | specialists | `lib/sketch-recognition/specialists/specialist-model.ts` | `476d7284fa661f3bc857432e79266f3a65705c37ca816db8383a326279aee621` | 8,693 |
| `specialist-registry.ts` | specialists | `lib/sketch-recognition/specialists/specialist-registry.ts` | `37abbacfb6f8153185677b10a6f10ef9bddb5e7ebba800a13104bbe6a6301cf5` | 2,932 |
| `specialist-ensemble.ts` | specialists | `lib/sketch-recognition/specialists/specialist-ensemble.ts` | `eadbf8d1c0b969f56784237634837c4eec8d94d75683ca689e1616c1deb56273` | 5,944 |
| `types.ts` | specialists | `lib/sketch-recognition/specialists/types.ts` | `729ac98df28e3abd5597d503e2768ffb5f27f8479b50ef02797fbb7acc8eae85` | 2,283 |
| `letter-a-model-weights.json` | configs | `lib/sketch-recognition/letter-a-model-weights.json` | `2185aebae2123851f3702efb421efc74a7d0ff379d9b14a2db02a1665bad3bd8` | 20,843 |
| `test-handwriting-sequences.ts` | tests | `scripts/test-handwriting-sequences.ts` | `2885328dda8019b482ffdd2b7557c13a781a2d503d56a669fb73f29078f4bbb1` | 17,576 |
| `test-specialists.ts` | tests | `scripts/test-specialists.ts` | `e0d4ec1122aeb6d0fdbc4bd7cd2e9e801c22b3eacb9ae0544e72d92cfa962eb6` | 9,351 |
| `test-cnn-pipeline.ts` | tests | `scripts/test-cnn-pipeline.ts` | `f6cd44d59432545c2c8322e6105673c638701319b92a58851dcb838f41347a7a` | 9,171 |
| `test-smart-sketch.ts` | tests | `scripts/test-smart-sketch.ts` | `cb5ea442f74188fd2adee6f3452bb53eb526a5072298e479f8f1bb77eb5b8358` | 9,025 |
| `test-letter-a.ts` | tests | `scripts/test-letter-a.ts` | `d63b934ed29b85f2ffa525a26313bdf5de0df0ebe762aa1655e8e3581d53324d` | 13,795 |
| `train-cnn.ts` | training | `scripts/ml/train-cnn.ts` | `b52c4acbb69f79a09f7478fb2ce22463004abd64e1eceb9e35d2a0e38df94ad4` | 6,336 |
| `evaluate-specialists.ts` | training | `scripts/ml/evaluate-specialists.ts` | `47043d3f5d345e24a6f2703012c350004462d394896b9447aa2d03048111fb1b` | 13,803 |

## Verification Status
- All files verified byte-for-byte against original repository state.
- Hash integrity check: PASSED.
- Non-A/B frozen status: LOCKED & PROTECTED.
