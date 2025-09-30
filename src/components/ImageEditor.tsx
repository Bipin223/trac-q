import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RotateCw, ZoomIn, Square, Circle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor = ({ imageUrl, onSave, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState<'circle' | 'square'>('circle');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      drawImage(img, 0, 1, 'circle', 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Keyboard controls for position
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setPosX(prev => Math.max(-200, prev - step));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPosX(prev => Math.min(200, prev + step));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setPosY(prev => Math.max(-200, prev - step));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPosY(prev => Math.min(200, prev + step));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse drag support on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - posX, y: e.clientY - posY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = Math.max(-200, Math.min(200, e.clientX - dragStart.x));
    const newY = Math.max(-200, Math.min(200, e.clientY - dragStart.y));
    
    setPosX(newX);
    setPosY(newY);
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const drawImage = (
    img: HTMLImageElement,
    rot: number,
    zoomLevel: number,
    shapeType: 'circle' | 'square',
    offsetX: number = 0,
    offsetY: number = 0
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rot * Math.PI) / 180);

    // Calculate dimensions
    const scale = Math.min(size / img.width, size / img.height) * zoomLevel;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Draw image with position offset
    ctx.drawImage(
      img,
      -scaledWidth / 2 + offsetX,
      -scaledHeight / 2 + offsetY,
      scaledWidth,
      scaledHeight
    );

    ctx.restore();

    // Apply shape mask
    if (shapeType === 'circle') {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Square shape - no masking needed, already drawn as square
  };

  useEffect(() => {
    if (image) {
      // Force re-draw when any parameter changes
      requestAnimationFrame(() => {
        drawImage(image, rotation, zoom, shape, posX, posY);
      });
    }
  }, [rotation, zoom, shape, image, posX, posY]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/png');
  };

  return (
    <div className="w-full max-w-2xl mx-auto max-h-[85vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile Picture</CardTitle>
          <p className="text-sm text-muted-foreground">Use arrow keys or drag the image to adjust position</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Canvas Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                className="border-4 border-purple-200 dark:border-purple-800 rounded-lg shadow-lg cursor-move"
                style={{
                  maxWidth: '400px',
                  maxHeight: '400px',
                  width: '100%',
                  height: 'auto',
                }}
              />
            </div>
          </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Shape Selection */}
          <div className="space-y-2">
            <Label>Shape</Label>
            <RadioGroup
              value={shape}
              onValueChange={(value) => setShape(value as 'circle' | 'square')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="circle" id="circle" />
                <Label htmlFor="circle" className="flex items-center gap-2 cursor-pointer">
                  <Circle className="h-4 w-4" />
                  Circle
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="square" id="square" />
                <Label htmlFor="square" className="flex items-center gap-2 cursor-pointer">
                  <Square className="h-4 w-4" />
                  Square
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                Zoom: {zoom.toFixed(1)}x
              </Label>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Rotation: {rotation}°
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                Rotate 90°
              </Button>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={(value) => setRotation(value[0])}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
