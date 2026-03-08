import { Autocomplete, TextField } from "@mui/material";

interface Props {
  assets: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}

export default function AssetFilter({ assets, value, onChange }: Props) {
  return (
    <Autocomplete
      size="small"
      options={assets}
      value={value}
      onChange={(_, v) => onChange(v)}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Filter asset…"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              fontSize: 13,
            },
          }}
        />
      )}
      sx={{ width: 180 }}
      clearOnEscape
    />
  );
}
