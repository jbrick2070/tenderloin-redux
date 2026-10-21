extends TextureRect
## Celeste's original imagined block-party border, not a real mural or endorsement.
const CREDIT := "Celeste's border: generic brass, Dez's hand drum, Thanh's tea, neighbors' heart. Original fictional art."
const IDS := ["brass", "drum", "tea", "heart"]
static var cache: Dictionary = {}
var vertical := false
var palette := "garden"

static func svg(pal: Array, stacked: bool = false) -> String:
	var paths := [
		'<path d="M12 17H43L57 9V29L43 21H19Q10 21 10 13V9H16M23 17V10M31 17V8M39 17V10M22 12H26M30 10H34M38 12H42"/>',
		'<path d="M23 8L27 27H43L47 8M25 13L43 23M45 13L28 23"/><ellipse cx="35" cy="8" rx="13" ry="4"/><path d="M18 2L27 5M43 4L52 1"/>',
		'<path d="M20 12H45L42 25H24ZM45 14Q58 12 52 21H44M17 29H49M27 9Q22 5 28 1M38 9Q33 5 39 1"/>',
		'<path d="M35 28C27 22 16 14 20 7C24 0 32 3 35 9C38 3 46 0 50 7C54 14 43 23 35 28Z"/>'
	]
	var out := '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"><rect width="100%%" height="100%%" fill="#f4e3ba"/>' % [72 if stacked else 288,128 if stacked else 32,72 if stacked else 288,128 if stacked else 32]
	for i in range(4):
		var offset := 'translate(0 %d)' % (i*32) if stacked else 'translate(%d 0)' % (i*72)
		out += '<g transform="%s" fill="none" stroke="#294f44" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">%s</g>'%[offset,paths[i]]
		out += '<g transform="%s" fill="none" stroke="%s" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">%s</g>'%[offset,pal[i%3],paths[i]]
	return out+'</svg>'

static func make_texture(pal: Array, stacked: bool = false) -> ImageTexture:
	var key := str(pal)+str(stacked)
	if not cache.has(key):
		var image := Image.new()
		if image.load_svg_from_string(svg(pal,stacked),2.0)!=OK: return null
		cache[key] = ImageTexture.create_from_image(image)
	return cache[key]

func setup_signature() -> void:
	name = "BlockPartyInkBorder"
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE
	accessibility_description = CREDIT
	expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stretch_mode = TextureRect.STRETCH_SCALE

func present(pal: Array, stacked: bool) -> void:
	vertical = stacked
	custom_minimum_size = Vector2(28,0) if stacked else Vector2(0,24)
	texture = make_texture(pal,stacked)

func ink_snapshot() -> Dictionary:
	var boxes: Array[Dictionary] = []
	for i in range(4):
		var r := Rect2(global_position+Vector2(0,size.y*i/4.0) if vertical else global_position+Vector2(size.x*i/4.0,0),Vector2(size.x,size.y/4.0) if vertical else Vector2(size.x/4.0,size.y))
		boxes.append({"id":IDS[i],"x":r.position.x,"y":r.position.y,"width":r.size.x,"height":r.size.y})
	return {"credit":CREDIT,"icons":boxes,"vertical":vertical,"focusable":false}
