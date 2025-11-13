/*
 * Minimal QR Code generator based on qrcode-generator (MIT license by Kazuhiko Arase)
 * Adapted for TypeScript usage within the client to avoid external dependencies.
 */

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const PAD0 = 0xec;
const PAD1 = 0x11;

const EXP_TABLE = new Array<number>(256);
const LOG_TABLE = new Array<number>(256);

for (let i = 0; i < 256; i += 1) {
  EXP_TABLE[i] = i < 8 ? 1 << i : 0;
}

for (let i = 8; i < 256; i += 1) {
  const e = EXP_TABLE[i - 4];
  EXP_TABLE[i] = e ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}

for (let i = 0; i < 255; i += 1) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

const gexp = (n: number) => {
  let value = n;
  while (value < 0) {
    value += 255;
  }
  while (value >= 256) {
    value -= 255;
  }
  return EXP_TABLE[value];
};

const glog = (n: number) => {
  if (n < 1) {
    throw new Error(`glog(${n})`);
  }
  return LOG_TABLE[n];
};

class QRPolynomial {
  constructor(private readonly coefficients: number[], private readonly shift: number) {
    let offset = 0;
    while (offset < coefficients.length && coefficients[offset] === 0) {
      offset += 1;
    }
    this.coefficients = coefficients.slice(offset);
    this.shift = shift;
  }

  get length(): number {
    return this.coefficients.length;
  }

  public getAt(index: number): number {
    return this.coefficients[index];
  }

  public multiply(e: QRPolynomial): QRPolynomial {
    const product = new Array(this.length + e.length - 1).fill(0);
    for (let i = 0; i < this.length; i += 1) {
      for (let j = 0; j < e.length; j += 1) {
        product[i + j] ^= gexp(glog(this.getAt(i)) + glog(e.getAt(j)));
      }
    }
    return new QRPolynomial(product, 0);
  }

  public mod(e: QRPolynomial): QRPolynomial {
    if (this.length - e.length < 0) {
      return this;
    }

    const ratio = glog(this.getAt(0)) - glog(e.getAt(0));
    const result = this.coefficients.slice();

    for (let i = 0; i < e.length; i += 1) {
      result[i] ^= gexp(glog(e.getAt(i)) + ratio);
    }

    return new QRPolynomial(result, 0).mod(e);
  }
}

class QRBitBuffer {
  public buffer: number[] = [];
  public length = 0;

  public get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  public put(num: number, length: number) {
    for (let i = 0; i < length; i += 1) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  public putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length += 1;
  }
}

class QR8bitByte {
  public mode = 4;
  public data: number[];

  constructor(public readonly text: string) {
    this.data = [];
    for (let i = 0; i < text.length; i += 1) {
      this.data.push(text.charCodeAt(i));
    }
  }

  public getLength(): number {
    return this.data.length;
  }

  public write(buffer: QRBitBuffer) {
    for (let i = 0; i < this.data.length; i += 1) {
      buffer.put(this.data[i], 8);
    }
  }
}

const getErrorCorrectionPolynomial = (errorCorrectionLength: number) => {
  let polynomial = new QRPolynomial([1], 0);
  for (let i = 0; i < errorCorrectionLength; i += 1) {
    polynomial = polynomial.multiply(new QRPolynomial([1, gexp(i)], 0));
  }
  return polynomial;
};

const QRRSBlock = {
  getRSBlocks: (typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel) => {
    const rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + EC_LEVEL_INDEX[errorCorrectionLevel]];
    if (!rsBlock) {
      throw new Error(`RS block not found for typeNumber: ${typeNumber}`);
    }
    const length = rsBlock.length / 3;
    const list: Array<{ dataCount: number; totalCount: number }> = [];
    for (let i = 0; i < length; i += 1) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j += 1) {
        list.push({ dataCount, totalCount });
      }
    }
    return list;
  },
};

const TYPE_NUMBER_LIMITS = [
  0,
  26, 44, 70, 100, 134, 172, 196, 242, 292,
  346, 404, 466, 532, 581, 655, 733, 815, 901, 991,
  1085, 1156, 1258, 1364, 1474,
  1588, 1706, 1828, 1921, 2051,
  2185, 2323, 2465, 2611, 2761,
  2876, 3034, 3196, 3362, 3532,
];

const EC_LEVEL_INDEX: Record<ErrorCorrectionLevel, number> = {
  L: 0,
  M: 1,
  Q: 2,
  H: 3,
};

const RS_BLOCK_TABLE: number[][] = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15], [2, 33, 11],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14], [4, 39, 13],
  [2, 121, 97], [2, 60, 38], [4, 40, 18], [4, 40, 14],
  [2, 146, 116], [3, 58, 36], [4, 36, 16], [4, 36, 12],
  [2, 86, 68], [4, 69, 43], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 59, 36], [6, 43, 19], [6, 43, 15],
  [4, 107, 82], [2, 48, 26], [8, 36, 16], [8, 36, 12],
  [4, 120, 90], [4, 60, 28], [8, 40, 18], [8, 40, 14],
  [4, 134, 108], [4, 67, 32], [8, 33, 14], [12, 33, 11],
  [4, 151, 121], [6, 45, 24], [10, 36, 16], [12, 33, 11],
  [6, 151, 121], [8, 47, 25], [10, 42, 15], [12, 33, 11],
  [8, 151, 121], [8, 44, 24], [12, 33, 15], [16, 33, 11],
  [8, 152, 122], [10, 46, 24], [14, 36, 16], [16, 36, 12],
  [10, 152, 122], [10, 46, 24], [16, 36, 16], [18, 36, 12],
  [12, 152, 122], [12, 45, 24], [18, 36, 16], [20, 36, 12],
  [14, 152, 122], [16, 47, 24], [18, 36, 16], [22, 36, 12],
  [16, 152, 122], [18, 45, 24], [20, 36, 16], [24, 36, 12],
  [18, 152, 122], [20, 47, 24], [22, 36, 16], [26, 36, 12],
  [20, 147, 117], [24, 45, 24], [24, 36, 16], [28, 36, 12],
  [22, 147, 117], [26, 45, 24], [28, 36, 16], [30, 36, 12],
  [24, 147, 117], [28, 45, 24], [30, 36, 16], [32, 36, 12],
  [26, 147, 117], [30, 45, 24], [32, 36, 16], [34, 36, 12],
  [28, 147, 117], [32, 45, 24], [34, 36, 16], [36, 36, 12],
  [30, 147, 117], [34, 45, 24], [36, 36, 16], [38, 36, 12],
  [32, 147, 117], [36, 45, 24], [38, 36, 16], [40, 36, 12],
  [34, 147, 117], [40, 45, 24], [40, 36, 16], [42, 36, 12],
  [36, 147, 117], [42, 45, 24], [42, 36, 16], [44, 36, 12],
  [38, 147, 117], [44, 45, 24], [44, 36, 16], [46, 36, 12],
];

class QRCodeModel {
  private readonly modules: Array<Array<boolean | null>>;
  private moduleCount: number;
  private dataCache: number[] | null = null;
  private readonly dataList: QR8bitByte[] = [];

  constructor(private readonly typeNumber: number, private readonly errorCorrectionLevel: ErrorCorrectionLevel) {
    this.moduleCount = typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row += 1) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }
  }

  public addData(data: string) {
    this.dataList.push(new QR8bitByte(data));
    this.dataCache = null;
  }

  public isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error('Module out of bounds');
    }
    return Boolean(this.modules[row][col]);
  }

  public getModuleCount(): number {
    return this.moduleCount;
  }

  public make() {
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(true, 0);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(true);
    }

    if (!this.dataCache) {
      this.dataCache = QRCodeModel.createData(
        this.typeNumber,
        this.errorCorrectionLevel,
        this.dataList,
      );
    }

    const length = this.dataCache.length;
    let bitIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) {
        col -= 1;
      }

      for (let row = 0; row < this.moduleCount; row += 1) {
        for (let i = 0; i < 2; i += 1) {
          if (this.modules[row][col - i] !== null) {
            continue;
          }
          let mask = false;
          if (bitIndex < length * 8) {
            mask = ((this.dataCache[Math.floor(bitIndex / 8)] >>> (7 - (bitIndex % 8))) & 1) === 1;
          }
          const dark = mask;
          this.modules[row][col - i] = this.shouldMask(row, col - i) ? !dark : dark;
          bitIndex += 1;
        }
      }

      col -= 1;

      for (let row = this.moduleCount - 1; row >= 0; row -= 1) {
        for (let i = 0; i < 2; i += 1) {
          if (this.modules[row][col - i] !== null) {
            continue;
          }
          let mask = false;
          if (bitIndex < length * 8) {
            mask = ((this.dataCache[Math.floor(bitIndex / 8)] >>> (7 - (bitIndex % 8))) & 1) === 1;
          }
          const dark = mask;
          this.modules[row][col - i] = this.shouldMask(row, col - i) ? !dark : dark;
          bitIndex += 1;
        }
      }
    }

    this.setupTypeInfo(false, this.getBestMaskPattern());

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(false);
    }
  }

  private shouldMask(row: number, col: number): boolean {
    const maskPattern = this.getBestMaskPattern();
    switch (maskPattern) {
      case 0:
        return (row + col) % 2 === 0;
      case 1:
        return row % 2 === 0;
      case 2:
        return col % 3 === 0;
      case 3:
        return (row + col) % 3 === 0;
      case 4:
        return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5:
        return ((row * col) % 2) + ((row * col) % 3) === 0;
      case 6:
        return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
      case 7:
        return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
      default:
        return false;
    }
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || this.moduleCount <= row + r) {
        continue;
      }
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || this.moduleCount <= col + c) {
          continue;
        }
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let i = 0; i < this.moduleCount; i += 1) {
      if (this.modules[i][6] !== null) {
        continue;
      }
      this.modules[i][6] = i % 2 === 0;
    }

    for (let j = 0; j < this.moduleCount; j += 1) {
      if (this.modules[6][j] !== null) {
        continue;
      }
      this.modules[6][j] = j % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = getPatternPositions(this.typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            if (Math.abs(r) === 2 || Math.abs(c) === 2) {
              this.modules[row + r][col + c] = true;
            } else if (r === 0 && c === 0) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean) {
    const bits = QRCodeModel.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: MaskPattern) {
    const data = (EC_LEVEL_DATA[this.errorCorrectionLevel] << 3) | maskPattern;
    const bits = QRCodeModel.getBCHTypeInfo(data);

    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    this.modules[this.moduleCount - 8][8] = !test;
  }

  private getBestMaskPattern(): MaskPattern {
    let minLostPoint = Infinity;
    let pattern: MaskPattern = 0;

    for (let i = 0; i < 8; i += 1) {
      this.applyMask(i as MaskPattern);
      const lostPoint = getLostPoint(this);
      if (lostPoint < minLostPoint) {
        minLostPoint = lostPoint;
        pattern = i as MaskPattern;
      }
    }

    return pattern;
  }

  private applyMask(maskPattern: MaskPattern) {
    for (let row = 0; row < this.moduleCount; row += 1) {
      for (let col = 0; col < this.moduleCount; col += 1) {
        if (this.modules[row][col] === null) {
          continue;
        }
        let invert = false;
        switch (maskPattern) {
          case 0:
            invert = (row + col) % 2 === 0;
            break;
          case 1:
            invert = row % 2 === 0;
            break;
          case 2:
            invert = col % 3 === 0;
            break;
          case 3:
            invert = (row + col) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
            break;
          case 5:
            invert = ((row * col) % 2) + ((row * col) % 3) === 0;
            break;
          case 6:
            invert = (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
            break;
          case 7:
            invert = (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
            break;
          default:
            break;
        }
        this.modules[row][col] = invert ? !this.modules[row][col] : this.modules[row][col];
      }
    }
  }

  private static createData(
    typeNumber: number,
    errorCorrectionLevel: ErrorCorrectionLevel,
    dataList: QR8bitByte[],
  ): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QRBitBuffer();

    dataList.forEach((data) => {
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    });

    let totalDataCount = 0;
    rsBlocks.forEach((block) => {
      totalDataCount += block.dataCount;
    });

    if (buffer.length > totalDataCount * 8) {
      throw new Error('Data overflow');
    }

    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }

    while (buffer.length < totalDataCount * 8) {
      buffer.put(PAD0, 8);
      if (buffer.length >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }

    let offset = 0;
    const dataBytes: number[] = new Array(totalDataCount).fill(0);

    for (let i = 0; i < totalDataCount; i += 1) {
      dataBytes[i] = buffer.buffer[i] ?? 0;
    }

    const dataCount = rsBlocks.map((block) => block.dataCount);
    const totalCount = rsBlocks.map((block) => block.totalCount);

    const maxDataCount = Math.max(...dataCount);
    const maxTotalCount = Math.max(...totalCount);

    const dataRsBlocks: number[][] = [];
    const errorRsBlocks: number[][] = [];

    for (let i = 0; i < rsBlocks.length; i += 1) {
      const dataNum = rsBlocks[i].dataCount;
      const totalNum = rsBlocks[i].totalCount;
      const data = dataBytes.slice(offset, offset + dataNum);
      offset += dataNum;
      const rsPoly = getErrorCorrectionPolynomial(totalNum - dataNum);
      const modPoly = new QRPolynomial(data, 0).mod(rsPoly);
      const errorCount = rsPoly.length - 1;
      const error = new Array(errorCount).fill(0);
      for (let j = 0; j < errorCount; j += 1) {
        error[j] = modPoly.getAt(j);
      }
      dataRsBlocks.push(data);
      errorRsBlocks.push(error);
    }

    const result: number[] = [];

    for (let i = 0; i < maxTotalCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dataRsBlocks[r].length) {
          result.push(dataRsBlocks[r][i]);
        }
      }
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < errorRsBlocks[r].length) {
          result.push(errorRsBlocks[r][i]);
        }
      }
    }

    return result;
  }

  private static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15) >= 0) {
      d ^= G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15));
    }
    return ((data << 10) | d) ^ G15_MASK;
  }

  private static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18) >= 0) {
      d ^= G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18));
    }
    return (data << 12) | d;
  }
}

const G15 = 0b10100110111;
const G18 = 0b1111100100101;
const G15_MASK = 0b101010000010010;

const QRUtil = {
  getBCHDigit: (data: number) => {
    let digit = 0;
    let value = data;
    while (value !== 0) {
      digit += 1;
      value >>>= 1;
    }
    return digit;
  },
};

const EC_LEVEL_DATA: Record<ErrorCorrectionLevel, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

const getLengthInBits = (mode: number, type: number) => {
  if (type <= 9) {
    if (mode === 4) {
      return 8;
    }
  } else if (type <= 26) {
    if (mode === 4) {
      return 16;
    }
  } else if (mode === 4) {
    return 16;
  }
  return 8;
};

const getPatternPositions = (type: number) => {
  if (type === 1) {
    return [];
  }
  const pos: number[] = [];
  const count = Math.floor(type / 7) + 2;
  const size = type * 4 + 17;
  const interval = Math.ceil((size - 13) / (count * 2 - 2)) * 2;
  let current = size - 7;
  for (let i = 0; i < count - 1; i += 1) {
    pos.unshift(current);
    current -= interval;
  }
  pos.unshift(6);
  return pos;
};

const getLostPoint = (qr: QRCodeModel): number => {
  const moduleCount = qr.getModuleCount();
  let lostPoint = 0;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      let sameCount = 0;
      const dark = qr.isDark(row, col);
      for (let r = -1; r <= 1; r += 1) {
        if (row + r < 0 || moduleCount <= row + r) {
          continue;
        }
        for (let c = -1; c <= 1; c += 1) {
          if (col + c < 0 || moduleCount <= col + c || (r === 0 && c === 0)) {
            continue;
          }
          if (dark === qr.isDark(row + r, col + c)) {
            sameCount += 1;
          }
        }
      }
      if (sameCount > 5) {
        lostPoint += 3 + sameCount - 5;
      }
    }
  }

  for (let row = 0; row < moduleCount - 1; row += 1) {
    for (let col = 0; col < moduleCount - 1; col += 1) {
      const darkCount = [
        qr.isDark(row, col),
        qr.isDark(row + 1, col),
        qr.isDark(row, col + 1),
        qr.isDark(row + 1, col + 1),
      ].filter(Boolean).length;
      if (darkCount === 0 || darkCount === 4) {
        lostPoint += 3;
      }
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount - 6; col += 1) {
      if (
        qr.isDark(row, col) &&
        !qr.isDark(row, col + 1) &&
        qr.isDark(row, col + 2) &&
        qr.isDark(row, col + 3) &&
        qr.isDark(row, col + 4) &&
        !qr.isDark(row, col + 5) &&
        qr.isDark(row, col + 6)
      ) {
        lostPoint += 40;
      }
    }
  }

  for (let col = 0; col < moduleCount; col += 1) {
    for (let row = 0; row < moduleCount - 6; row += 1) {
      if (
        qr.isDark(row, col) &&
        !qr.isDark(row + 1, col) &&
        qr.isDark(row + 2, col) &&
        qr.isDark(row + 3, col) &&
        qr.isDark(row + 4, col) &&
        !qr.isDark(row + 5, col) &&
        qr.isDark(row + 6, col)
      ) {
        lostPoint += 40;
      }
    }
  }

  let darkCount = 0;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        darkCount += 1;
      }
    }
  }

  const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
  lostPoint += ratio * 10;

  return lostPoint;
};

const getTypeNumberForText = (text: string): number => {
  for (let type = 1; type < TYPE_NUMBER_LIMITS.length; type += 1) {
    if (text.length <= TYPE_NUMBER_LIMITS[type]) {
      return type;
    }
  }
  return 40;
};

const createMatrix = (text: string, ecl: ErrorCorrectionLevel = 'M') => {
  const typeNumber = getTypeNumberForText(text);
  const qr = new QRCodeModel(typeNumber, ecl);
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const rowData: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      rowData.push(qr.isDark(row, col));
    }
    matrix.push(rowData);
  }
  return matrix;
};

export const generateQrDataUrl = (text: string, size = 240, margin = 16): string => {
  const matrix = createMatrix(text);
  const moduleCount = matrix.length;
  const scale = Math.max(1, Math.floor((size - margin * 2) / moduleCount));
  const canvasSize = moduleCount * scale + margin * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = '#000000';

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (matrix[row][col]) {
        ctx.fillRect(margin + col * scale, margin + row * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL();
};

export const createQrMatrix = createMatrix;
