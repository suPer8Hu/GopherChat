package vision

import (
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"

	"golang.org/x/image/draw"
)

func DecodeImage(r io.Reader) (image.Image, string, error) {
	return image.Decode(r)
}

func Preprocess(img image.Image, inputW, inputH int) ([]float32, error) {
	if img == nil {
		return nil, errors.New("image is nil")
	}
	if inputW <= 0 || inputH <= 0 {
		return nil, errors.New("invalid input size")
	}

	dst := image.NewRGBA(image.Rect(0, 0, inputW, inputH))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	channels := 3
	data := make([]float32, inputW*inputH*channels)
	planeSize := inputW * inputH
	for y := 0; y < inputH; y++ {
		for x := 0; x < inputW; x++ {
			r, g, b, _ := dst.At(x, y).RGBA()
			rf := float32(r>>8) / 255.0
			gf := float32(g>>8) / 255.0
			bf := float32(b>>8) / 255.0

			idx := y*inputW + x
			data[idx] = rf
			data[planeSize+idx] = gf
			data[2*planeSize+idx] = bf
		}
	}
	return data, nil
}
