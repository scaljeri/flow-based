import { SocketOutPipe } from './socket-out.pipe';

describe('SocketOutPipe', () => {
  it('create an instance', () => {
    const pipe = new SocketOutPipe();
    expect(pipe).toBeTruthy();
  });
});
