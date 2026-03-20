declare module 'mammoth' {
  const mammoth: {
    extractRawText(input: { buffer: Buffer } | { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages?: Array<{ type: string; message: string }> }>;
  };

  export default mammoth;
}
