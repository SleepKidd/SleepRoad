#!/usr/bin/env python3
"""Convert CountMaster's CharacterFBX.fbx to Sleep Road's compact JS mesh.

The converter intentionally supports the small FBX 7.x subset used by the
MIT-licensed source asset. It preserves the source vertices, polygon topology,
and per-polygon-vertex normals, then applies the same axis rotation and 5x
scale used by the Unity prefab.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Node:
    name: str
    props: list
    children: list["Node"]


class BinaryFbx:
    def __init__(self, path: Path):
        self.data = path.read_bytes()
        if not self.data.startswith(b"Kaydara FBX Binary"):
            raise ValueError("Only binary FBX files are supported")
        self.version = struct.unpack_from("<I", self.data, 23)[0]
        self.header_size = 25 if self.version >= 7500 else 13

    def read_property(self, offset: int):
        kind = chr(self.data[offset])
        offset += 1
        scalars = {"Y": ("h", 2), "I": ("i", 4), "F": ("f", 4), "D": ("d", 8), "L": ("q", 8)}
        if kind in scalars:
            fmt, size = scalars[kind]
            return struct.unpack_from("<" + fmt, self.data, offset)[0], offset + size
        if kind == "C":
            return bool(self.data[offset]), offset + 1
        if kind in "fdlib":
            count, encoding, packed_size = struct.unpack_from("<III", self.data, offset)
            offset += 12
            raw = self.data[offset : offset + packed_size]
            offset += packed_size
            if encoding:
                raw = zlib.decompress(raw)
            fmt = {"f": "f", "d": "d", "l": "q", "i": "i", "b": "b"}[kind]
            return list(struct.unpack("<" + fmt * count, raw)), offset
        if kind in "SR":
            size = struct.unpack_from("<I", self.data, offset)[0]
            offset += 4
            raw = self.data[offset : offset + size]
            offset += size
            return (raw.decode("utf-8", "replace") if kind == "S" else raw), offset
        raise ValueError(f"Unsupported FBX property type: {kind}")

    def read_nodes(self, offset: int, limit: int):
        nodes = []
        while offset + self.header_size <= limit:
            if self.version >= 7500:
                end, count, _, name_size = struct.unpack_from("<QQQB", self.data, offset)
            else:
                end, count, _, name_size = struct.unpack_from("<IIIB", self.data, offset)
            offset += self.header_size
            if end == 0:
                break
            name = self.data[offset : offset + name_size].decode("utf-8")
            offset += name_size
            props = []
            for _ in range(count):
                value, offset = self.read_property(offset)
                props.append(value)
            children = self.read_nodes(offset, end) if offset < end else []
            nodes.append(Node(name, props, children))
            offset = end
        return nodes

    def roots(self):
        return self.read_nodes(27, len(self.data))


def child(node: Node, name: str):
    return next(item for item in node.children if item.name == name)


def encode_f32(values):
    return base64.b64encode(struct.pack("<" + "f" * len(values), *values)).decode("ascii")


def encode_u16(values):
    return base64.b64encode(struct.pack("<" + "H" * len(values), *values)).decode("ascii")


def convert(source: Path, output: Path):
    fbx = BinaryFbx(source)
    objects = next(node for node in fbx.roots() if node.name == "Objects")
    geometry = next(node for node in objects.children if node.name == "Geometry" and node.props[-1] == "Mesh")
    vertices = child(geometry, "Vertices").props[0]
    polygon_indices = child(geometry, "PolygonVertexIndex").props[0]
    normal_layer = child(geometry, "LayerElementNormal")
    mapping = child(normal_layer, "MappingInformationType").props[0]
    reference = child(normal_layer, "ReferenceInformationType").props[0]
    normals = child(normal_layer, "Normals").props[0]
    if mapping != "ByPolygonVertex" or reference != "Direct":
        raise ValueError(f"Unexpected normal layout: {mapping}/{reference}")

    source_vertices = list(zip(vertices[0::3], vertices[1::3], vertices[2::3]))
    faces, face, face_normals = [], [], []
    normal_cursor = 0

    for raw_index in polygon_indices:
        vertex_index = -raw_index - 1 if raw_index < 0 else raw_index
        normal = normals[normal_cursor * 3 : normal_cursor * 3 + 3]
        normal_cursor += 1
        face.append(vertex_index)
        face_normals.append(normal)
        if raw_index < 0:
            faces.append(list(zip(face, face_normals)))
            face, face_normals = [], []

    def web_vertex(vertex_index):
        x, y, z = source_vertices[vertex_index]
        return x * 5, z * 5, -y * 5

    def build_mesh(selected_faces, pivot=(0, 0, 0)):
        positions, out_normals, indices, lookup = [], [], [], {}

        def out_index(vertex_index, normal):
            key = (vertex_index,) + tuple(round(value, 7) for value in normal)
            if key not in lookup:
                lookup[key] = len(positions) // 3
                x, y, z = web_vertex(vertex_index)
                nx, ny, nz = normal
                positions.extend((x - pivot[0], y - pivot[1], z - pivot[2]))
                out_normals.extend((nx, nz, -ny))
            return lookup[key]

        for polygon in selected_faces:
            corners = [out_index(index, normal) for index, normal in polygon]
            for i in range(1, len(corners) - 1):
                indices.extend((corners[0], corners[i], corners[i + 1]))
        if len(positions) // 3 > 65535:
            raise ValueError("Mesh no longer fits Uint16 indices")
        return positions, out_normals, indices

    def face_group(polygon):
        points = [web_vertex(index) for index, _ in polygon]
        cx = sum(point[0] for point in points) / len(points)
        cy = sum(point[1] for point in points) / len(points)
        if cy > 1.18:
            return "head"
        if cy < .62:
            return "leftLeg" if cx < 0 else "rightLeg"
        if abs(cx) > .20:
            return "leftArm" if cx < 0 else "rightArm"
        return "body"

    pivots = {
        "head": (0, 1.18, 0), "body": (0, 0, 0),
        "leftArm": (-.20, 1.04, 0), "rightArm": (.20, 1.04, 0),
        "leftLeg": (-.09, .62, 0), "rightLeg": (.09, .62, 0),
    }
    positions, out_normals, indices = build_mesh(faces)
    parts = {
        name: build_mesh([polygon for polygon in faces if face_group(polygon) == name], pivot)
        for name, pivot in pivots.items()
    }

    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    js = f"""'use strict';
// Exact browser conversion of UnityToBrain/CountMaster's CharacterFBX.fbx.
// Source: https://github.com/UnityToBrain/CountMaster/blob/main/Assets/3D%20Assets/CharacterFBX.fbx
// Source SHA-256: {source_sha}
// License and attribution: THIRD_PARTY_NOTICES.md
(() => {{
  const decode=(text,Type)=>{{const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);}};
  const mesh=(positions,normals,indices)=>({{positions:decode(positions,Float32Array),normals:decode(normals,Float32Array),indices:decode(indices,Uint16Array)}});
  window.CountMasterCharacter={{
    source:'UnityToBrain/CountMaster — Assets/3D Assets/CharacterFBX.fbx',
    sourceSha256:'{source_sha}',
    positions:decode('{encode_f32(positions)}',Float32Array),
    normals:decode('{encode_f32(out_normals)}',Float32Array),
    indices:decode('{encode_u16(indices)}',Uint16Array),
    parts:{{
{chr(10).join(f"      {name}:mesh('{encode_f32(data[0])}','{encode_f32(data[1])}','{encode_u16(data[2])}')" + (',' if i < len(parts)-1 else '') for i,(name,data) in enumerate(parts.items()))}
    }}
  }};
}})();
"""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(js, encoding="utf-8")
    print(f"Wrote {output}: {len(positions)//3} vertices, {len(indices)//3} triangles")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    convert(args.source, args.output)


if __name__ == "__main__":
    main()
