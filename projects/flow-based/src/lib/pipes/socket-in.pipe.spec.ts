import { SocketInPipe } from './socket-in.pipe';

describe('SocketInPipe', () => {
  it('create an instance', () => {
    const pipe = new SocketInPipe();
    expect(pipe).toBeTruthy();
  });
});
