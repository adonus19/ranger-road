#!/bin/zsh
# Builds a card's 1004x1548 2x2 step image from four painted 1024x1536 steps.
# usage: tools/knots/compose.sh <card-id> <step1.png> <step2.png> <step3.png> <step4.png>
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
magick -size 1004x1548 xc:'#FEFDF9' \
  $tmp/panel-1.png -geometry +8+10 -composite \
  $tmp/panel-2.png -geometry +506+10 -composite \
  $tmp/panel-3.png -geometry +8+778 -composite \
  $tmp/panel-4.png -geometry +506+778 -composite \
  -quality 82 -define webp:method=6 $out/sequence.webp
rm -rf $tmp
ls -la $out
