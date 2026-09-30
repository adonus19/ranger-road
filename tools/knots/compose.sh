#!/bin/zsh
# Builds a card's step image from an even number of painted 1024x1536 steps, two per row:
# four steps give a 1004x1548 2x2 grid, six a 1004x2316 2x3 grid.
# usage: tools/knots/compose.sh <card-id> <step1.png> ... <stepN.png>
set -e
id=$1; shift
out=public/images/field-manual/$id
tmp=$(mktemp -d)
mkdir -p $out
i=0
for src in "$@"; do
  i=$((i + 1))
  # Even out the paper so neighbouring panels match (#F5F1E6).
  read r g b <<< $(magick $src -crop 1004x40+10+10 +repage -scale 1x1! -format '%[fx:255*r] %[fx:255*g] %[fx:255*b]' info:)
  magick $src \
    -channel R -evaluate multiply $(( 245.0 / r )) \
    -channel G -evaluate multiply $(( 241.0 / g )) \
    -channel B -evaluate multiply $(( 230.0 / b )) +channel \
    -resize 507x760 -gravity center -crop 490x760+0+0 +repage $tmp/panel-$i.png
done
rows=$(( ($# + 1) / 2 ))
height=$(( 20 + rows * 760 + (rows - 1) * 8 ))
args=()
for n in $(seq 1 $#); do
  col=$(( (n - 1) % 2 )); row=$(( (n - 1) / 2 ))
  args+=($tmp/panel-$n.png -geometry +$(( 8 + col * 498 ))+$(( 10 + row * 768 )) -composite)
done
magick -size 1004x$height xc:'#FEFDF9' $args -quality 82 -define webp:method=6 $out/sequence.webp
echo "$out/sequence.webp: 1004x$height"
rm -rf $tmp
ls -la $out
