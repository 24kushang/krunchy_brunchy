import os

def clean_dump(input_path, output_path):
    print(f"Reading from {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as infile:
        lines = infile.readlines()

    output_lines = []
    in_migrations_block = False
    skipped_count = 0

    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Detect the start of the COPY block for the migrations table
        if line.startswith('COPY public.migrations '):
            in_migrations_block = True
            print("Skipping COPY public.migrations block...")
            i += 1
            skipped_count += 1
            continue
            
        # Detect the end of the COPY block
        if in_migrations_block:
            skipped_count += 1
            if line.strip() == '\\.':
                in_migrations_block = False
            i += 1
            continue
            
        output_lines.append(line)
        i += 1

    print(f"Skipped {skipped_count} lines of migrations table data.")
    print(f"Writing clean dump to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as outfile:
        outfile.writelines(output_lines)
    print("Done!")

if __name__ == '__main__':
    input_file = '/Users/kushangharia/kbs/tmp/data_dump.sql'
    output_file = '/Users/kushangharia/kbs/tmp/clean_data_dump.sql'
    clean_dump(input_file, output_file)
