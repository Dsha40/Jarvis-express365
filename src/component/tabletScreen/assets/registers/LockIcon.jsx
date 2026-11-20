/*  EL CANDADO DE «SOLO LECTURA»: el de las rotaciones de días anteriores (RegisterStaleBlock, RegisterStaleRow) y el
 *  de su lista de toques (RegisterTouchList). Del color del texto, y decorado: quien lo usa pone el texto.
 *
 *  @param {number} size  el lado, en píxeles
 */
export default function LockIcon({ size = 12 }) {
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <rect x='5' y='11' width='14' height='10' rx='2' />
            <path d='M8 11V7a4 4 0 0 1 8 0v4' />
        </svg>
    );
}
