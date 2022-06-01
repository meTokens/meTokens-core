// SPDX-License-Identifier: MIT
// copied from https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/test/helpers/merkleTree.js

import { ethers } from "hardhat";

export class MerkleTree {
  elements: any[];
  layers: any;
  constructor(elements: string[]) {
    // Filter empty strings and hash elements
    this.elements = elements
      .filter((el) => el)
      .map((el) =>
        Buffer.from(ethers.utils.arrayify(ethers.utils.keccak256(el)))
      );
    // Sort elements
    this.elements.sort((a, b) =>
      Buffer.compare(Buffer.from(a), Buffer.from(b))
    );
    // Deduplicate elements
    this.elements = this.bufDedup(this.elements);

    // Create layers
    this.layers = this.getLayers(this.elements);
  }

  getLayers(elements: string[]) {
    if (elements.length === 0) {
      return [[""]];
    }

    const layers = [];
    layers.push(elements);

    // Get next layer until we reach the root
    while (layers[layers.length - 1].length > 1) {
      layers.push(this.getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  getNextLayer(elements: any) {
    return elements.reduce(
      (layer: any[], el: string, idx: number, arr: any[]) => {
        if (idx % 2 === 0) {
          // Hash the current element with its pair element
          layer.push(this.combinedHash(el, arr[idx + 1]));
        }

        return layer;
      },
      []
    );
  }

  combinedHash(first: any, second: any) {
    if (!first) {
      return second;
    }
    if (!second) {
      return first;
    }

    return Buffer.from(
      ethers.utils.arrayify(
        ethers.utils.keccak256(this.sortAndConcat(first, second))
      )
    );
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  getHexRoot() {
    return ethers.utils.hexlify(this.getRoot());
  }

  getProof(el: string) {
    let idx = this.bufIndexOf(el, this.elements);

    if (idx === -1) {
      throw new Error(`Element ${el.toString()} does not exist in Merkle tree`);
    }

    return this.layers.reduce((proof: any, layer: any) => {
      const pairElement = this.getPairElement(idx, layer);

      if (pairElement) {
        proof.push(pairElement);
      }

      idx = Math.floor(idx / 2);

      return proof;
    }, []);
  }

  getHexProof(el: any) {
    const proof = this.getProof(el);
    return this.bufArrToHexArr(proof);
  }

  getPairElement(idx: number, layers: string[]) {
    const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

    if (pairIdx < layers.length) {
      return layers[pairIdx];
    } else {
      return null;
    }
  }

  bufIndexOf(el: any, arr: any[]) {
    let hash;

    // Convert element to 32 byte hash if it is not one already
    if (el.length !== 32 || !Buffer.isBuffer(el)) {
      hash = Buffer.from(ethers.utils.arrayify(ethers.utils.keccak256(el)));
    } else {
      hash = el;
    }

    for (let i = 0; i < arr.length; i++) {
      if (hash.equals(arr[i])) {
        return i;
      }
    }

    return -1;
  }

  bufDedup(elements: any[]) {
    return elements.filter((el, idx) => {
      return idx === 0 || !(elements[idx - 1] === el);
    });
  }

  bufArrToHexArr(arr: any) {
    if (arr.some((el: any) => !Buffer.isBuffer(el))) {
      throw new Error("Array is not an array of buffers");
    }

    return arr.map((el: any) => "0x" + el.toString("hex"));
  }

  sortAndConcat(...args: any[]): Buffer {
    return Buffer.concat(
      [...args].map((a) => Buffer.from(a)).sort(Buffer.compare)
    );
  }
}
