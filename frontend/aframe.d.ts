import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type AFrameElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
    [key: string]: any;
};

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'a-scene': AFrameElementProps;
            'a-assets': AFrameElementProps;
            'a-video': AFrameElementProps;
            'a-camera': AFrameElementProps;
            'a-entity': AFrameElementProps;
            'a-plane': AFrameElementProps;
            'a-light': AFrameElementProps;
            'a-box': AFrameElementProps;
            'a-sphere': AFrameElementProps;
            'a-cylinder': AFrameElementProps;
            'a-sky': AFrameElementProps;
            'a-text': AFrameElementProps;
            'a-image': AFrameElementProps;
        }
    }
}
